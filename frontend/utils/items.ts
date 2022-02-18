import { BaseItemDto, BaseItemPerson } from '@jellyfin/client-axios';

/**
 * A list of valid collections that should be treated as folders.
 */
export const validLibraryTypes = [
  'CollectionFolder',
  'Folder',
  'UserView',
  'playlists',
  'PhotoAlbum'
];

export const validPersonTypes = [
  'Actor',
  'Director',
  'Composer',
  'Writer',
  'GuestStar',
  'Producer',
  'Conductor',
  'Lyricist'
];

export enum CardShapes {
  Portrait = 'portrait-card',
  Thumb = 'thumb-card',
  Square = 'square-card',
  Banner = 'banner-card'
}

export type ValidCardShapes =
  | CardShapes.Portrait
  | CardShapes.Thumb
  | CardShapes.Square
  | CardShapes.Banner;

/**
 * Determines if the item is a person
 *
 * @param {*} item - The item to be checked.
 * @returns {boolean} Whether the provided item is of type BaseItemPerson.
 */
export function isPerson(
  item: BaseItemDto | BaseItemPerson
): item is BaseItemPerson {
  if (
    'Role' in (item as BaseItemPerson) ||
    (item.Type && validPersonTypes.includes(item.Type))
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if the string is a valid MD5 hash.
 *
 * @exports
 * @param {string} input - The string to check for validity
 * @returns {boolean} - A boolean representing the validity of the input string
 */
export function isValidMD5(input: string): boolean {
  return /[a-fA-F0-9]{32}/.test(input);
}

/**
 * Get the Material Design Icon name associated with a type of library
 *
 * @param {(string | undefined | null)} libraryType - Type of the library
 * @returns {string} Name of the Material Design Icon associated with the type
 */
export function getLibraryIcon(libraryType: string | undefined | null): string {
  switch (libraryType?.toLowerCase()) {
    case 'movies':
      return 'mdi-movie';
    case 'music':
      return 'mdi-music';
    case 'photos':
      return 'mdi-image';
    case 'livetv':
      return 'mdi-youtube-tv';
    case 'tvshows':
      return 'mdi-television-classic';
    case 'homevideos':
      return 'mdi-image-multiple';
    case 'musicvideos':
      return 'mdi-music-box';
    case 'books':
      return 'mdi-book-open-page-variant';
    case 'channels':
      return 'mdi-youtube';
    case 'playlists':
      return 'mdi-playlist-play';
    default:
      return 'mdi-folder';
  }
}

/**
 * Get the card shape associated with a collection type
 *
 * @param {(string | null | undefined)} collectionType - Type of the collection
 * @returns {string} CSS class to use as the shape of the card
 */
export function getShapeFromCollectionType(
  collectionType: string | null | undefined
): ValidCardShapes {
  switch (collectionType?.toLowerCase()) {
    case 'livetv':
    case 'musicvideos':
      return CardShapes.Thumb;
    case 'folders':
    case 'playlists':
    case 'music':
      return CardShapes.Square;
    case 'boxsets':
    case 'movies':
    case 'tvshows':
    case 'books':
    default:
      return CardShapes.Portrait;
  }
}

/**
 * Gets the card shape associated with a collection type
 *
 * @param {(string | null | undefined)} itemType - type of item
 * @returns {string} CSS class to use as the shape of the card
 */
export function getShapeFromItemType(
  itemType: string | null | undefined
): ValidCardShapes {
  // TODO: Refactor to take a BaseItemDto or BaseItemPerson instead
  switch (itemType?.toLowerCase()) {
    case 'audio':
    case 'folder':
    case 'musicalbum':
    case 'musicartist':
    case 'musicgenre':
    case 'photoalbum':
    case 'playlist':
    case 'video':
      return CardShapes.Square;
    case 'episode':
    case 'musicvideo':
    case 'studio':
      return CardShapes.Thumb;
    case 'book':
    case 'boxSet':
    case 'genre':
    case 'movie':
    case 'person':
    case 'series':
    default:
      return CardShapes.Portrait;
  }
}
