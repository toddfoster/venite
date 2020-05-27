import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';

import { Observable, of, from } from 'rxjs';
import { switchMap, map, tap } from 'rxjs/operators';

import { AuthService } from '../auth/auth.service';
import { LocalStorageService } from './localstorage.service';
import { StoredPreference } from './stored-preference';

import { Liturgy } from '@venite/ldf';

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {

  constructor(
    private readonly afs: AngularFirestore,
    private readonly auth : AuthService,
    private readonly storage : LocalStorageService
  ) { }

  // Generates a key to be used in local storage
  private localStorageKey(key : string, liturgy : Liturgy = undefined) : string {
    return liturgy ? `preference-${liturgy.slug}-${liturgy.language}-${liturgy.version}-${key}` : `preference-${key}`;
  }

  // Sets a single preference
  set(key : string, value : string, uid: string = undefined, liturgy : Liturgy = undefined) {
    const prefDoc : StoredPreference = { key, value }
    if(liturgy) {
      prefDoc.liturgy = liturgy.slug;
      prefDoc.language = liturgy.language || 'en';
      prefDoc.version = liturgy.version || 'Rite-II';
    }

    if(uid) {
      prefDoc.uid = uid;

      const ref = liturgy ? `${liturgy.slug}-${liturgy.language}-${liturgy.version}-${key}-${uid}` : `${key}-${uid}`;
      const doc = this.afs.doc<StoredPreference>(`Preference/${ref}`);
      doc.set(prefDoc);
    } else {
      this.storage.set(this.localStorageKey(key, liturgy), prefDoc);
    }
  }

  // Gets a single preference by key
  get(key : string) : Observable<StoredPreference[]> {
    return this.auth.user
      .pipe(
        map(user => [user?.uid, key]),
        switchMap(([uid, key]) => {
          // if logged in, use Firestore
          if(uid) {
            return this.afs.collection<StoredPreference>('Preference', ref =>
              ref.where('uid', '==', uid)
                 .where('key', '==', key)
            ).valueChanges()
          }
          // otherwise use local storage
          else {
            return from(this.storage.get(this.localStorageKey(key)))
          }
        })
      );
  }

  /** Returns all preferences of **any** liturgy saved by the user, but with this one's language and version
    * This allows for smart matching—if I don't have a default Bible translation set for English Rite II Evening Prayer,
    * see if I have one for English Rite II Morning Prayer  */
  getPreferencesForLiturgy(liturgy : Liturgy) : Observable<any[]> {
    if(!liturgy) {
      console.warn('(getPreferencesForLiturgy) liturgy is', liturgy);
      return of([]);
    } else {
      return this.auth.user
        .pipe(
          map(user => [user?.uid, liturgy]),
          switchMap(([uid, liturgy]) => {
            // if logged in, use Firestore
            if(uid) {
              return this.afs.collection<StoredPreference>('Preference', ref =>
                ref.where('uid', '==', uid)
                   .where('language', '==', (liturgy as Liturgy).language || 'en')
                   .where('version', '==', (liturgy as Liturgy).version || 'Rite-II')
              ).valueChanges()
            }
            // if not, use local storage
            else {
              // don't have the ability for a query as with Firestore
              // instead, return all keys that match the local storage key pattern
              const exampleKey = this.localStorageKey('%%%', liturgy),
                    baseKey = exampleKey.replace('%%%', ''),
                    // storage returns a Promise, but we're not in an async function
                    // because we need to return an observable; so transform it into an observable
                    allKeys = from(this.storage.keys());
              return allKeys.pipe(
                // select only keys for this liturgy
                map(obj => obj.keys.filter(key => key.includes(baseKey))),
                // map in the value for each key
                switchMap(keys => from(Promise.all(keys.map(key => this.storage.get(key))))),
              );
            }
          })
        )
    }
  }
}
