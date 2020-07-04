import { Component, OnInit } from '@angular/core';
import { Router, NavigationStart, ActivatedRoute } from '@angular/router';
import { Observable, of, combineLatest, merge } from 'rxjs';
import { mapTo, switchMap, map, tap, filter, take, startWith } from 'rxjs/operators';
import { Liturgy, ClientPreferences, dateFromYMD, liturgicalDay, liturgicalWeek, addOneDay, LiturgicalDay, LiturgicalDocument, LiturgicalWeek } from '@venite/ldf';
import { DocumentService } from '../services/document.service';
import { CalendarService } from '../services/calendar.service';
import { PrayService } from './pray.service';
import { ModalController } from '@ionic/angular';
import { DisplaySettingsComponent } from './display-settings/display-settings.component';
import { DisplaySettings } from './display-settings/display-settings';
import { PreferencesService } from '../preferences/preferences.service';

interface PrayState {
  liturgy: LiturgicalDocument;
  day: LiturgicalDay;
  prefs: ClientPreferences;
}

@Component({
  selector: 'venite-pray',
  templateUrl: './pray.page.html',
  styleUrls: ['./pray.page.scss'],
})
export class PrayPage implements OnInit {
  doc$ : Observable<LiturgicalDocument>;

  // Liturgy data to be loaded from the database if we come straight to this page
  state$ : Observable<PrayState>;

  // Display settings
  settings$ : Observable<DisplaySettings>;

  constructor(
    private router : Router,
    private route : ActivatedRoute,
    private documents : DocumentService,
    private calendarService : CalendarService,
    public prayService : PrayService,
    private modal : ModalController,
    private preferencesService : PreferencesService
  ) { }

  ngOnInit() {
    // If passed through router state, it's simply a synchronous `PrayState` object
    // This probably means we came from the home page and clicked Pray, so the liturgy
    // and liturgical day had been preloaded
    const windowHistoryState$ : Observable<PrayState> = this.router.events.pipe(
      mapTo(window && window.history.state)
    );

    // If passed as router params (e.g., arrived at page from a link or refresh),
    // we have to do the work to wire these params together
  
    // `LiturgicalDocument`s that match the language/version/slug passed in the URL
    const liturgy$ : Observable<LiturgicalDocument[]> = this.route.params.pipe(
      switchMap(({ language, version, liturgy }) =>
        this.documents.findDocumentsBySlug(liturgy, language, new Array(version))
      )
    );
  
    // `LiturgicalDay` (via week) that matches the date/kalendar passed in the URL,
    // given the `LiturgicalDocument` found above (for `evening`)
    const week$ : Observable<LiturgicalWeek[]> = this.route.params.pipe(
      switchMap(({ language, version, y, m, d, liturgy, kalendar, vigil }) => 
        this.calendarService.buildWeek(of(dateFromYMD(y, m, d)), of(kalendar), of(vigil))
      )
    );
    const day$ = combineLatest(liturgy$, week$, this.route.params).pipe(
      switchMap(([liturgy, week, params]) => 
        this.calendarService.buildDay(
          of(dateFromYMD(params.y, params.m, params.d)),
          of(params.kalendar),
          of(liturgy).pipe(map(x => x[0])),
          of(week),
          of(params.vigil),
        )
      )
    )

    // `prefs` are passed as a JSON-encoded string in the param
    const prefs$ : Observable<ClientPreferences> = this.route.params.pipe(
      map(({ prefs }) => JSON.parse(prefs || '{}'))
    );

    // Unifies everything from the router params
    const routerParamState$ : Observable<PrayState> = combineLatest(liturgy$, day$, prefs$).pipe(
      map(([liturgy, day, prefs]) => ({ liturgy: liturgy[0], day, prefs }))
    );

    // Unite the data passed from the state and the data derived from the route
    // Note that this should never call the observables from the route params
    // if the state is already present, due to the take(1)
    this.state$ = merge(windowHistoryState$, routerParamState$).pipe(
      filter(state => state && state.hasOwnProperty('day') && state.hasOwnProperty('liturgy')),
 //     take(1)
    )

    this.doc$ = this.state$.pipe(
      tap(state => console.log('doc$ state', state)),
      filter(state => state.hasOwnProperty('liturgy') && state.hasOwnProperty('day') && state.hasOwnProperty('prefs')),
      switchMap(state => this.prayService.compile(state.liturgy, state.day, state.prefs)),
    );

    // Grab display settings from preferences
    this.settings$ = combineLatest([
      this.grabPreference('dropcaps'),
      this.grabPreference('response'),
      this.grabPreference('repeatAntiphon'),
      this.grabPreference('fontscale'),
      this.grabPreference('font'),
      this.grabPreference('voiceChoice'),
      this.grabPreference('voiceRate'),
      this.grabPreference('voiceBackground'),
      this.grabPreference('voiceBackgroundVolume'),
      this.grabPreference('psalmVerses'),
      this.grabPreference('bibleVerses'),
      this.grabPreference('meditationBell'),
      this.grabPreference('darkmode')
    ]).pipe(
      map(settings => new DisplaySettings( ... settings))
    );
  }

  /* Display Settings */
  async openSettings(settings : DisplaySettings) {
    const modal = await this.modal.create({
      component: DisplaySettingsComponent,
    });

    modal.componentProps = {
      settings,
      modal
    };

    await modal.present();
  }

  grabPreference(key : string) : Observable<any> {
    return this.preferencesService.get(key).pipe(startWith(undefined)).pipe(
      map(keyvalue => keyvalue?.value)
    );
  }

  processSettings(settings : DisplaySettings) : string[] {
    return [
      `dropcaps-${settings.dropcaps}`,
      `response-${settings.response}`,
      `repeat-antiphon-${settings.repeatAntiphon}`,
      `fontscale-${settings.fontscale.toString()}`,
      `font-${settings.font}`,
      `psalmverses-${settings.psalmVerses}`,
      `bibleverses-${settings.bibleVerses}`
    ];
  }
}
