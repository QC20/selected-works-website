/**
 * The photos in My Computer > Hard Disk (C:) > Pictures.
 *
 * Generated from ~/Desktop/Billeder. Each photo exists twice:
 *
 *  - `full`  — downscaled original, imported through webpack so it gets a
 *    content hash and is only fetched when a picture is actually opened.
 *  - `thumb` — 96px preview served from public/. These live outside the
 *    bundle on purpose: at ~2 KB each CRA would inline all 19 as base64 into
 *    main.js, so every visitor would download them even without ever opening
 *    My Computer.
 */

const PUBLIC = process.env.PUBLIC_URL || '';

export interface Picture {
    id: string;
    name: string;
    thumb: string;
    full: string;
    /** Approximate size in KB, for the folder's status bar. */
    size: number;
}

const pictures: Picture[] = [
    {
        id: '001',
        name: '001.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/001.jpg`,
        full: require('../../assets/pictures/billeder/001.jpg'),
        size: 169,
    },
    {
        id: '002',
        name: '002.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/002.jpg`,
        full: require('../../assets/pictures/billeder/002.jpg'),
        size: 66,
    },
    {
        id: '003',
        name: '003.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/003.jpg`,
        full: require('../../assets/pictures/billeder/003.jpg'),
        size: 377,
    },
    {
        id: '004',
        name: '004.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/004.jpg`,
        full: require('../../assets/pictures/billeder/004.jpg'),
        size: 127,
    },
    {
        id: '005',
        name: '005.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/005.jpg`,
        full: require('../../assets/pictures/billeder/005.jpg'),
        size: 37,
    },
    {
        id: '006',
        name: '006.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/006.jpg`,
        full: require('../../assets/pictures/billeder/006.jpg'),
        size: 169,
    },
    {
        id: '007',
        name: '007.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/007.jpg`,
        full: require('../../assets/pictures/billeder/007.jpg'),
        size: 193,
    },
    {
        id: '008',
        name: '008.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/008.jpg`,
        full: require('../../assets/pictures/billeder/008.jpg'),
        size: 320,
    },
    {
        id: '009',
        name: '009.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/009.jpg`,
        full: require('../../assets/pictures/billeder/009.jpg'),
        size: 289,
    },
    {
        id: '010',
        name: '010.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/010.jpg`,
        full: require('../../assets/pictures/billeder/010.jpg'),
        size: 112,
    },
    {
        id: '011',
        name: '011.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/011.jpg`,
        full: require('../../assets/pictures/billeder/011.jpg'),
        size: 123,
    },
    {
        id: '012',
        name: '012.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/012.jpg`,
        full: require('../../assets/pictures/billeder/012.jpg'),
        size: 62,
    },
    {
        id: '013',
        name: '013.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/013.jpg`,
        full: require('../../assets/pictures/billeder/013.jpg'),
        size: 294,
    },
    {
        id: '014',
        name: '014.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/014.jpg`,
        full: require('../../assets/pictures/billeder/014.jpg'),
        size: 121,
    },
    {
        id: '015',
        name: '015.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/015.jpg`,
        full: require('../../assets/pictures/billeder/015.jpg'),
        size: 177,
    },
    {
        id: '016',
        name: '016.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/016.jpg`,
        full: require('../../assets/pictures/billeder/016.jpg'),
        size: 434,
    },
    {
        id: '017',
        name: '017.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/017.jpg`,
        full: require('../../assets/pictures/billeder/017.jpg'),
        size: 382,
    },
    {
        id: '018',
        name: '018.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/018.jpg`,
        full: require('../../assets/pictures/billeder/018.jpg'),
        size: 352,
    },
    {
        id: '019',
        name: '019.jpg',
        thumb: `${PUBLIC}/pictures/thumbs/019.jpg`,
        full: require('../../assets/pictures/billeder/019.jpg'),
        size: 384,
    },
];

export default pictures;
