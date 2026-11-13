// Keep Firebase's API intact and report only completed server writes.
import * as firestore from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {trackSave} from './save-feedback.js?v=128';
export * from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
export const runTransaction=(...args)=>trackSave(()=>firestore.runTransaction(...args));
export const setDoc=(...args)=>trackSave(()=>firestore.setDoc(...args));
export const updateDoc=(...args)=>trackSave(()=>firestore.updateDoc(...args));
export const deleteDoc=(...args)=>trackSave(()=>firestore.deleteDoc(...args));
export const addDoc=(...args)=>trackSave(()=>firestore.addDoc(...args));
export function writeBatch(...args){const batch=firestore.writeBatch(...args),commit=batch.commit.bind(batch);batch.commit=(...values)=>trackSave(()=>commit(...values));return batch;}
