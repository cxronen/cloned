/**
 * This store handles the state of the local player.
 *
 * In the other part, playbackManager is suited to handle the playback state in
 * an agnostic way, regardless of where the media is being played (remotely or locally)
 */
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { cloneDeep, isNil } from 'lodash-es';
import { nextTick, reactive, watch } from 'vue';
import JASSUB from 'jassub';
import jassubWorker from 'jassub/dist/jassub-worker.js?url';
import 'jassub/dist/jassub-worker.wasm?url';
import jassubDefaultFont from 'jassub/dist/default.woff2?url';
import { mediaElementRef, playbackManagerStore } from '@/store';
import { useRemote, useRouter } from '@/composables';

const playbackManager = playbackManagerStore();
let jassub: JASSUB | undefined;
const fullscreenVideoRoute = '/playback/video';
const fullscreenMusicRoute = '/playback/music';
let visualiser: AudioMotionAnalyzer | undefined;

/**
 * == INTERFACES AND TYPES ==
 */
interface PlayerElementState {
  isFullscreenMounted: boolean;
  isPiPMounted: boolean;
  isStretched: boolean;
  isVisualising: boolean;
}

/**
 * == CLASS CONSTRUCTOR ==
 */
class PlayerElementStore {
  /**
   * == STATE ==
   */
  private _defaultState: PlayerElementState = {
    isFullscreenMounted: false,
    isPiPMounted: false,
    isStretched: true,
    isVisualising: false
  };

  private _state = reactive<PlayerElementState>(cloneDeep(this._defaultState));
  /**
   * == GETTERS AND SETTERS ==
   */
  public get isFullscreenMounted(): boolean {
    return this._state.isFullscreenMounted;
  }

  public set isFullscreenMounted(newIsMounted: boolean) {
    this._state.isFullscreenMounted = newIsMounted;
  }

  public get isPiPMounted(): boolean {
    return this._state.isPiPMounted;
  }

  public set isPiPMounted(newIsPipMounted: boolean) {
    this._state.isPiPMounted = newIsPipMounted;
  }

  public get isStretched(): boolean {
    return this._state.isStretched;
  }

  public set isStretched(newIsStretched: boolean) {
    this._state.isStretched = newIsStretched;
  }

  public get isVisualising(): boolean {
    return this._state.isVisualising;
  }

  public set isVisualising(newIsVisualising: boolean) {
    this._state.isVisualising = newIsVisualising;
  }

  public get isFullscreenVideoPlayer(): boolean {
    return useRouter().currentRoute.value.fullPath === fullscreenVideoRoute;
  }

  /**
   * == ACTIONS ==
   */
  public toggleFullscreenVideoPlayer = async (): Promise<void> => {
    const router = useRouter();

    if (this.isFullscreenVideoPlayer) {
      router.back();
    } else {
      await router.push(fullscreenVideoRoute);
    }
  };

  public toggleVisualiser = (): void => {
    const visualiserContainer =
      document.querySelectorAll<HTMLElement>('.visualiser')[0];
    const audioElement = document.querySelector<HTMLMediaElement>('audio');

    if (this.isVisualising && visualiser != undefined) {
      this.isVisualising = false;
      visualiser.toggleAnalyzer();
    } else {
      this.isVisualising = true;

      if (
        (visualiser == undefined ||
          visualiserContainer.querySelectorAll('canvas').length === 0) &&
        audioElement != undefined
      ) {
        visualiser = new AudioMotionAnalyzer(visualiserContainer, {
          source: audioElement,
          mode: 2,
          gradient: 'prism',
          reflexRatio: 0.025,
          overlay: true,
          showBgColor: true,
          bgAlpha: 0,
          fftSize: 16_384,
          frequencyScale: 'bark',
          showScaleX: false,
          smoothing: 0.9
        });
      } else if (visualiser != undefined) {
        visualiser.toggleAnalyzer();
      }
    }
  };

  private _setSsaTrack = (trackSrc: string, attachedFonts?: string[]): void => {
    if (
      !jassub &&
      mediaElementRef.value &&
      mediaElementRef.value instanceof HTMLVideoElement
    ) {
      jassub = new JASSUB({
        video: mediaElementRef.value,
        subUrl: trackSrc,
        fonts: attachedFonts,
        workerUrl: jassubWorker,
        availableFonts: { 'liberation sans': jassubDefaultFont },
        // Both parameters needed for subs to work on iOS
        prescaleFactor: 0.8,
        onDemandRender: false
      });
    } else if (jassub) {
      if (Array.isArray(attachedFonts)) {
        for (const font of attachedFonts) {
          jassub.addFont(font);
        }
      }

      jassub.setTrackByUrl(trackSrc);
    }
  };

  public freeSsaTrack = (): void => {
    if (jassub) {
      try {
        jassub.destroy();
      } catch {}

      jassub = undefined;
    }
  };

  private _isSupportedFont = (mimeType: string | undefined | null): boolean => {
    return (
      !isNil(mimeType) &&
      mimeType.startsWith('font/') &&
      (mimeType.includes('ttf') ||
        mimeType.includes('otf') ||
        mimeType.includes('woff'))
    );
  };

  /**
   * Applies the current subtitle from the playbackManager store
   *
   * It first disables all the VTT and SSA subtitles
   * It then find the potential index of the applied VTT sub
   * Or the PlaybackExternalTrack object of the potential SSA sub
   *
   * If external and VTT, it shows the correct one
   * If external and SSA, it loads it in SO
   *
   * If embedded, a new transcode is automatically fetched from the playbackManager watchers.
   */
  public applyCurrentSubtitle = async (): Promise<void> => {
    const remote = useRemote();
    const serverAddress = remote.sdk.api?.basePath;
    /**
     * Finding (if it exists) the VTT or SSA track associated to the newly picked subtitle
     */
    const vttIdx = playbackManager.currentItemVttParsedSubtitleTracks.findIndex(
      (sub) => sub.srcIndex === playbackManager.currentSubtitleStreamIndex
    );
    const ass = playbackManager.currentItemAssParsedSubtitleTracks.find(
      (sub) => sub.srcIndex === playbackManager.currentSubtitleStreamIndex
    );
    const attachedFonts =
      playbackManager.currentMediaSource?.MediaAttachments?.filter((a) =>
        this._isSupportedFont(a.MimeType)
      )
        .map((a) => {
          if (a.DeliveryUrl && serverAddress) {
            return `${serverAddress}${a.DeliveryUrl}`;
          }
        })
        .filter((a): a is string => a !== undefined) ?? [];

    if (!mediaElementRef.value) {
      return;
    }

    await nextTick();

    /**
     * Disabling VTT and SSA subs at first
     */
    for (const textTrack of mediaElementRef.value.textTracks) {
      if (textTrack.mode !== 'disabled') {
        textTrack.mode = 'disabled';
      }
    }

    playerElement.freeSsaTrack();

    if (vttIdx !== -1 && mediaElementRef.value.textTracks[vttIdx]) {
      /**
       * If VTT found, applying it
       */
      mediaElementRef.value.textTracks[vttIdx].mode = 'showing';
    } else if (ass !== undefined && ass.src) {
      /**
       * If SSA, using Subtitle Opctopus
       */
      playerElement._setSsaTrack(ass.src, attachedFonts);
    }
  };

  private _clear = (): void => {
    Object.assign(this._state, this._defaultState);
  };

  public constructor() {
    const remote = useRemote();

    /**
     * * Move user to the fullscreen page when starting video playback by default
     * * Move user out of the fullscreen pages when playback is over
     */
    watch(
      () => playbackManager.currentItem,
      async (newValue, oldValue) => {
        const router = useRouter();
        const currentFullPath = router.currentRoute.value.fullPath;

        if (
          !newValue &&
          (currentFullPath.includes(fullscreenMusicRoute) ||
            currentFullPath.includes(fullscreenVideoRoute))
        ) {
          router.back();
        } else if (
          newValue &&
          !oldValue &&
          playbackManager.currentlyPlayingMediaType === 'Video'
        ) {
          await this.toggleFullscreenVideoPlayer();
        }
      }
    );

    watch(
      () => remote.auth.currentUser,
      () => {
        if (!remote.auth.currentUser) {
          this._clear();
        }
      }
    );
  }
}

const playerElement = new PlayerElementStore();

export default playerElement;
