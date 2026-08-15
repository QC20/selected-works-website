/**
 * The photos in My Computer > Hard Disk (C:) > My Paintings.
 *
 * Separate from `pictures.ts` (the general Pictures folder, 19 shipped
 * photos) on purpose: this is specifically his own paintings, so the two can
 * grow independently — Pictures without ever being mistaken for a gallery of
 * his artwork, and this folder without being buried among photos of
 * everything else. Same shape and thumbnail convention as `pictures.ts`.
 */

const PUBLIC = process.env.PUBLIC_URL || '';

export interface PaintingPicture {
    id: string;
    name: string;
    thumb: string;
    full: string;
    /** Approximate size in KB, for the folder's status bar. */
    size: number;
}

const myPaintings: PaintingPicture[] = [
    {
        id: 'painting-001',
        name: 'Painting.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/painting.jpg`,
        full: require('../../assets/pictures/myPaintings/painting.jpg'),
        size: 258,
    },
];

export default myPaintings;
