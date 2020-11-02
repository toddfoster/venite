import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';

import { HolyDay, Kalendar, Liturgy, LiturgicalDay, LiturgicalDocument, LiturgicalWeek, LiturgicalWeekIndex, ProperLiturgy, addOneDay, dateFromYMD, dateToYMD, liturgicalWeek, liturgicalDay } from '@venite/ldf';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {

  constructor(private readonly afs: AngularFirestore) { }

  /** Get a menu of available `Kalendar`s that provide a full seasonal cycle */
  findKalendars() : Observable<Kalendar[]> {
    return this.afs.collection<Kalendar>('Kalendar', ref =>
      ref.where('sanctoral', '==', false)
    ).valueChanges();
  }

  /** Get a menu of available `Kalendar`s that provide saints’ days */
  findSanctorals() : Observable<Kalendar[]> {
    return this.afs.collection<Kalendar>('Kalendar').valueChanges();
  }

  /** Get the appropriate `LiturgicalWeek` for a calculated week index */
  findWeek(kalendar : string, query : LiturgicalWeekIndex) : Observable<LiturgicalWeek[]> {
    return this.afs.collection<LiturgicalWeek>('LiturgicalWeek', ref =>
      ref.where('kalendar', '==', kalendar)
         .where('cycle', '==', query.cycle)
         .where('week', '==', query.week)
    ).valueChanges()
    // adjust propers if necessary (season after Pentecost)
    .pipe(
      map(weeks => weeks.map(week => query.proper ?
        new LiturgicalWeek({
          ... week,
          proper: query.proper,
          propers: `proper-${query.proper}`
        }) :
        week
      ))
    );
  }

  /** Find feast days on a given date */
  findFeastDays(kalendar : string, mmdd : string) : Observable<HolyDay[]> {
    return this.afs.collection<HolyDay>('HolyDay', ref =>
      ref.where('kalendar', '==', kalendar)
         .where('mmdd', '==', mmdd)
    ).valueChanges();
  }

  /** Find special days for a particular slug
    * @example
    * // Ash Wednesday
    * `wednesday-last-epiphany` */
  findSpecialDays(kalendar : string, slug : string) : Observable<HolyDay[]> {
    return this.afs.collection<HolyDay>('HolyDay', ref =>
      ref.where('kalendar', '==', kalendar)
         .where('slug', '==', slug)
    ).valueChanges();
  }

  /** Find Proper Liturgies for certain special days */
  findProperLiturgies(day : LiturgicalDay, language : string) : Observable<ProperLiturgy[]> {
    console.log('findProperLiturgies', day?.slug, language)
    return this.afs.collection<ProperLiturgy>('ProperLiturgy', ref =>
      ref.where('slug', '==', day.slug)
         .where('language', '==', language)
    ).valueChanges();
  }

  /** Find `HolyDay`s connected to either a date or a slug */
  addHolyDays(day : LiturgicalDay, vigil : boolean) : Observable<LiturgicalDay> {
    // generate query from the `LiturgicalDay`
    const [y, m, d] = day.date.split('-'),
          date = dateFromYMD(y, m, d),
          observedDate = vigil ? addOneDay(date) : date,
          observedM = observedDate.getMonth()+1,
          observedD = observedDate.getDate(),
          feasts = this.findFeastDays(day.kalendar, `${observedM}/${observedD}`),
          specials = this.findSpecialDays(day.kalendar, day.slug);

    // Thanksgiving Day
    const isNovember = date.getMonth() === 10, // January is 0, Feb 1, etc., so Sept is 8 
      isThursday = date.getDay() === 4, // Sunday is 0, Monday is 1
      nthWeekOfMonth = Math.ceil(date.getDate() / 7),
      thanksgiving = isNovember && isThursday && nthWeekOfMonth == 4 ? this.findSpecialDays(day.kalendar, 'thanksgiving-day') : of([]);

    return combineLatest(feasts, specials, thanksgiving)
      .pipe(
        tap(holydays => console.log('holydayzz', holydays)),
        // OR together the feasts and specials
        map(([feasts, specials, thanksgiving]) => feasts.concat(specials).concat(thanksgiving)),
        // incorporate them into the `LiturgicalDay`
        map(holydays => day.addHolyDays(holydays))
      );
  }

  buildWeek(date : Observable<Date>, kalendar : Observable<string>, vigil : Observable<boolean>) : Observable<LiturgicalWeek[]> {
    return combineLatest(date, kalendar, vigil)
      .pipe(
        switchMap(([date, kalendar, vigil]) => this.findWeek(kalendar, liturgicalWeek(vigil ? addOneDay(date) : date)))
      );
  }

  buildDay(date : Observable<Date>, kalendar : Observable<string>, liturgy: Observable<Liturgy|LiturgicalDocument>, week : Observable<LiturgicalWeek[]>, vigil : Observable<boolean>) {
    return combineLatest(date, kalendar, liturgy, week, vigil)
      .pipe(
        // build the liturgical day from the data given
        map(([date, kalendar, liturgy, week, vigil]) => ({
          day: liturgicalDay(vigil ? addOneDay(date) : date, kalendar, liturgy?.metadata?.evening, week[0]),
          date,
          vigil
        })),
        // if vigil, add the unmodified date back in
        map(({day, date, vigil}) => ({
          day: vigil ? new LiturgicalDay({ ... day, date: dateToYMD(date) }) : day,
          vigil
        })),
        // add holy days to that liturgical day
        switchMap(({day, vigil}) => this.addHolyDays(day, vigil)),
      );
  }
 }
