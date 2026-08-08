/* ----------------------------------------------------------------
   CONTENT STORE  (static site — no server)

   published : content.json as it is deployed right now
   working   : the copy being edited, kept in localStorage

   The live preview opens the site as ?preview=1, which makes the public
   page read `working` from the same localStorage key — so unsaved edits
   are visible immediately.

   Publishing is a two-step, deliberate flow:
     1. Save        -> writes `working` to localStorage
     2. Download    -> gives you content.json to commit and push
   ---------------------------------------------------------------- */

import { clone } from './dom.js';

const CONTENT_URL = '../content.json';
const WORKING_KEY = 'sp-portfolio-content';

const state = {
    published: null,
    working: null,
    savedAt: null
};

const SAVED_AT_KEY = 'sp-portfolio-content-saved-at';

/** Fetch content.json and restore any previously saved working copy. */
export async function init() {
    const res = await fetch(CONTENT_URL, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not read content.json (HTTP ${res.status})`);
    state.published = await res.json();

    let stored = null;
    try {
        stored = JSON.parse(localStorage.getItem(WORKING_KEY) || 'null');
    } catch (e) {
        /* corrupt entry — start from the published content */
    }

    state.working = stored || clone(state.published);
    state.savedAt = stored ? localStorage.getItem(SAVED_AT_KEY) : null;
}

export const published = () => state.published;
export const working = () => state.working;
export const savedAt = () => state.savedAt;

export const section = (key) => clone(state.working[key]);

/** True when the working copy differs from the deployed content.json. */
export const isDirty = () => JSON.stringify(state.working) !== JSON.stringify(state.published);

/** True when this one section differs from the deployed content.json. */
export const isSectionDirty = (key) =>
    JSON.stringify(state.working[key]) !== JSON.stringify(state.published[key]);

function persist() {
    state.savedAt = new Date().toISOString();
    localStorage.setItem(WORKING_KEY, JSON.stringify(state.working));
    localStorage.setItem(SAVED_AT_KEY, state.savedAt);
}

/** Save one edited section into the working copy. */
export function saveSection(key, data) {
    state.working[key] = clone(data);
    persist();
}

/** Replace the whole working copy (used by import). */
export function replaceAll(content) {
    if (!content || typeof content !== 'object') throw new Error('That file is not a content object.');
    const missing = Object.keys(state.published).filter((key) => !(key in content));
    if (missing.length) throw new Error('Missing sections: ' + missing.join(', '));
    state.working = clone(content);
    persist();
}

/** Throw one section back to what is live on the website. */
export function revertSection(key) {
    state.working[key] = clone(state.published[key]);
    persist();
}

/** Throw every unsaved and unpublished edit away. */
export function revertAll() {
    state.working = clone(state.published);
    localStorage.removeItem(WORKING_KEY);
    localStorage.removeItem(SAVED_AT_KEY);
    state.savedAt = null;
}

/** The exact text to write into public/content.json. */
export const asFileText = () => JSON.stringify(state.working, null, 2) + '\n';
