import { Component, Prop, Watch, State, Element, Host, Event, h, EventEmitter, Method } from '@stencil/core';
import { Text, Heading, Change } from '@venite/ldf';
import { getComponentClosestLanguage } from '../../utils/locale';
import showdown from 'showdown';

import EN from './text.i18n.en.json';
import ES from './text.i18n.es.json';
import { modalController } from '@ionic/core';

const LOCALE = {
  'en': EN,
  'es': ES
};
@Component({
  tag: 'ldf-text',
  styleUrl: 'text.scss',
  scoped: true
})
export class TextComponent {
  @Element() element: HTMLElement;

  // States
  @State() obj : Text;
  @State() localeStrings: { [x: string]: string; };

  // prayer list for authorized prayers
  @State() intentions: string[] | string = "";

  @Method()
  async setPrayerList(intentions : string[] | string): Promise<void> {
    this.intentions = intentions;
  }

  // Properties
  /**
   * An LDF Text object.
   */
  @Prop() doc : Text | string;
  @Watch('doc')
  docChanged(newDoc : Text | string) {
    try {
      if(typeof newDoc == 'string') {
        this.obj = new Text(JSON.parse(newDoc));
      } else {
        this.obj = new Text(newDoc);
      }

      if (this.obj?.style == "authorized-prayers") {
        console.log("(PrayerList) ldfAskForPrayerList")
        this.ldfAskForPrayerList.emit(true);
      }
    } catch(e) {
      console.warn(e);
      this.obj = new Text();
    }
  }

  /**
   * A JSON Pointer that points to the Text being edited
   */
  @Prop({ reflect: true }) path : string;

  /**
   * Whether the object is editable
   */
  @Prop() editable : boolean;

  /** Used to add Prayers and Thanksgivings */
  @Event({ bubbles: true }) ldfDocShouldChange: EventEmitter<Change>;
  
  /** Request prayer list for Prayers and Thanksgivings */
  @Event({ bubbles: true }) ldfAskForPrayerList : EventEmitter<boolean>;

  // Lifecycle events
  async componentWillLoad() {
    this.docChanged(this.doc);
    this.loadLocaleStrings();
  }

  // Private methods
  async loadLocaleStrings() : Promise<void> {
    try {
      this.localeStrings = LOCALE[getComponentClosestLanguage(this.element)];
    } catch(e) {
      console.warn(e);
    }
  }

  truncate(s : string, last : boolean = false, words : number = 20) : string {
    const keepPieces = words * 2,
      split = s.split(/([^\w\u00c0-\u017f])/g);
    if(!last) {
      return split.slice(0, keepPieces).concat('...').join("")
    } else {
      return new Array('...').concat(split.slice(split.length - keepPieces)).join("")
    }
  }

  async addPAndT(base: string, index: number) {
    const modal = await modalController.create({
      component: 'ldf-prayers-and-thanksgivings'
    });
    modal.componentProps = {
      base,
      index,
      modal,
      parent: this
    }
    await modal.present();
  }
  
  // Render
  render() {
    const localeStrings = this.localeStrings || {};
    /** `authorized-prayer` type */
    if(this.obj?.style === 'authorized-prayers') {
      const splits = this.path.split('/'),
        index = Number(splits[splits.length - 1]),
        base = splits.slice(0, splits.length - 1).join('/');

      return <Host>
        <ldf-label-bar>
          <ion-button onClick={() => this.addPAndT(base, index)} fill="clear">
            {localeStrings.authorized_prayers}
          </ion-button>
        </ldf-label-bar>
        {this.intentions?.length > 0 ?? <strong class="prayer-list">{localeStrings['prayer-list']}</strong>}
        {Array.isArray(this.intentions)
          ? <ul class="prayer-list">
              {this.intentions.map(intention => <li>{intention}</li>)}
            </ul>
          : <p class="prayer-list formatted">{this.intentions}</p>}
      </Host>;
    } else {
        let value = this.obj?.metadata?.rollup
        ? (this.obj?.value || []).map(s => s.replace(/\s+/g, ' '))
        : (this.obj?.value || []);
      let compiledValue : string[][] = value.map(s => {
        return s.split(/([\*\w\u00c0-\u017f\n\s,:;\.\-–—'“☩✠”‘’\!\?”\[\]\%\(\)\/\u0041-\u024F\u1400-\u167f\u0e00-\u0e5b]+([^\*\w\u00c0-\u017f\n\s,;:\.'“”☩✠‘’”\-–—\!\?\[\]\%\(\)\/\u0041-\u024F\u1400-\u167f\u0e00-\u0e5b]))/g);
      })
      if(!this.editable && this.obj?.display_format === 'abbreviated') {
        const firstSection = compiledValue[0],
          lastSection = compiledValue[compiledValue.length - 1];
        const firstChunk = this.truncate(firstSection[0]),
          lastChunk = this.truncate(lastSection[lastSection.length - 1], true);
        compiledValue = [[firstChunk], [lastChunk]];
      }

      console.log("compiledValue = ", compiledValue);
      
      if(this.editable) {
        return (
          <Host lang={this.obj.language}>
            <ldf-label-bar>
              <slot slot='end' name='controls'></slot>
            </ldf-label-bar>

            {/* Heading */}
            {!this.editable && <ldf-heading path={`${this.path}/label`} doc={new Heading({ type: 'heading', metadata: { level: 3 }, value: [this.obj.label], citation: this.obj.citation, source: this.obj.source })}></ldf-heading>}
            {this.editable && <ldf-label-bar>
              {!this.obj?.metadata?.omit_label && <h3 class="editable-label" slot="start">
                <ldf-editable-text
                  id={`${this.obj.uid || this.obj.slug}-label`}
                  text={this.obj?.label}
                  placeholder={localeStrings.label}
                  path={`${this.path}/label`}>
                </ldf-editable-text>
              </h3>}
              <ldf-editable-text slot="end"
                id="source-source"
                text={this.obj?.source?.source}
                path={`${this.path}/source/source`}
                placeholder={this.localeStrings?.source}
              >
              </ldf-editable-text>
              <ldf-editable-text slot="end"
                id="source-citation"
                text={this.obj?.source?.citation}
                path={`${this.path}/source/citation`}
                placeholder={this.localeStrings?.source_citation}
              >
              </ldf-editable-text>
            </ldf-label-bar>}

            <div class={`text ${this.editable ? 'editable' : ''} ${this.obj?.display_format || 'default'}`}>
              {this.obj.value.map((prayer, prayerIndex) =>
                <ldf-editable-text
                  id={`${this.obj.uid || this.obj.slug}-${prayerIndex}`}
                  text={prayer}
                  path={`${this.path}/value/${prayerIndex}`}>
                </ldf-editable-text>
              )}
              {(this.obj?.style === 'prayer' || (this.obj?.metadata?.response && !this.obj?.metadata?.omit_response)) && <span class='response'>
                <ldf-editable-text
                  id={`${this.obj.uid || this.obj.slug}-response`}
                  text={this.obj.metadata && this.obj.metadata.response}
                  path={`${this.path}/response`}
                  placeholder={localeStrings.amen}>
                </ldf-editable-text>
              </span>}
            </div>
          </Host>
        );
      }
      else {
        /** `markdown` types */
        if(this.obj?.style === 'markdown') {
          const converter = new showdown.Converter();
          return (this.obj?.value || []).map(value => <div innerHTML={converter.makeHtml(value)}></div>);
        }
        /** `text` and `prayer` types */
        else {  
          return (
            <div lang={this.obj?.language || 'en'} class={`text ${this.obj?.display_format || 'default'}`}>
              {/* Heading */}
              {((this.obj?.label && !this.obj?.metadata?.omit_label) || this.obj?.citation) && <ldf-heading
                path={this.path}
                doc={new Heading({ type: 'heading', metadata: { level: 3 }, value: [this.obj.metadata?.omit_label ? '' : this.obj.label], citation: this.obj.citation, source: this.obj.source })}>
              </ldf-heading>}
    
              {
                compiledValue.map((prayer, prayerIndex) =>
                  <p class="text-body" id={`${this.obj.uid || this.obj.slug}-prayerIndex`}>
                      {prayer?.map((chunk, chunkIndex) =>
                        <span id={`${this.obj.uid || this.obj.slug}-${prayerIndex}-${chunkIndex}`}>
                          <ldf-string text={chunk}
                            citation={{label: this.obj.label}}
                            dropcap={this.obj?.display_format == "force_dropcap" && prayerIndex === 0 && chunkIndex === 0 ? "force" : (prayerIndex === 0 && chunkIndex <= 1 ? "enabled" : "disabled")}
                            index={prayerIndex + chunkIndex}
                            fragment={this.path}
                          >
                          </ldf-string>
                        </span>
                      )}
                      {this.obj?.metadata?.response && prayerIndex == compiledValue.length - 1 && <span class="response"> {this.obj.metadata.response}</span>}
                      {!this.obj?.metadata?.response && this.obj.style == 'prayer' && prayerIndex == compiledValue.length - 1 && <span class="response"> {localeStrings.amen}</span>}
                  </p>
                )
              }
            </div>
          );
        }
      }
    }
  }
}
