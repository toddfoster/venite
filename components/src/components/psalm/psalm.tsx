import { Component, Element, Prop, Watch, State, Host, JSX, h } from '@stencil/core';
import { Psalm, PsalmVerse } from '../../../../ldf/src/psalm';
import { Heading } from '../../../../ldf/src/heading';
import { Refrain } from '../../../../ldf/src/refrain';


@Component({
  tag: 'ldf-psalm',
  styleUrl: 'psalm.scss',
  shadow: true
})
export class PsalmComponent {
  @Element() element : HTMLElement;

  // States
  @State() obj : Psalm;
  @State() localeStrings: { [x: string]: string; };
  @State() filteredValue : (PsalmVerse | Heading)[][];

  // Properties
  /**
   * An LDF Psalm object.
   */
  @Prop() doc : Psalm | string;
  @Watch('doc')
  docChanged(newDoc : Psalm | string) {
    try {
      if(typeof newDoc == 'string') {
        this.obj = new Psalm(JSON.parse(newDoc));
      } else {
        this.obj = new Psalm(newDoc);
      }
    } catch(e) {
      console.warn(e);
      this.obj = new Psalm();
    }
  }

  /**
   * A JSON Pointer that points to the Collect being edited
   */
  @Prop({ reflect: true }) path : string;

  /**
   * Whether the object is editable
   */
  @Prop() editable : boolean;

  // Lifecycle events
  async componentWillLoad() {
    this.docChanged(this.doc);
    this.filter();
  }

  // Private methods
  async filter() {
    this.filteredValue = this.obj.filteredVerses();
  }

  // Render helpers
  antiphonNode(antiphon : string | Refrain | { [x: string]: string | Refrain }) : JSX.Element {
    if(typeof antiphon == 'string') {
      const refrain = new Refrain({ value: [ antiphon ], style: 'antiphon' });
      return <ldf-refrain doc={ refrain }></ldf-refrain>
    } else if(antiphon instanceof Refrain || (typeof antiphon == 'object' && antiphon.type && antiphon.type == 'refrain')) {
      return <ldf-refrain doc={ antiphon as Refrain }></ldf-refrain>
    } else if(typeof antiphon == 'object') {
      // antiphon is something like an O antiphon tree:
      // { '12/23': '...', '12/24': '...' }
      const date = this.obj.day ? new Date(Date.parse(this.obj.day.date)) : new Date();
      return this.antiphonNode(antiphon[`${date.getMonth()+1}/${date.getDate()}`]);
    }
  }

  gloriaNode(gloria : string | Refrain) : JSX.Element {
    if(typeof gloria == 'string') {
      const refrain = new Refrain({ value: [ gloria ], style: 'gloria' });
      return <ldf-refrain doc={ refrain }></ldf-refrain>
    } else {
      return <ldf-refrain doc={ gloria }></ldf-refrain>
    }
  }

  headingNode() : JSX.Element {
    let label : string = this.obj.label;
    if(this.obj.style == 'canticle' && this.obj.metadata && this.obj.metadata.number && this.obj.metadata.localname) {
      label = `${this.obj.metadata.number}. ${this.obj.metadata.localname}`;
    } else if(this.obj.style == 'canticle' && this.obj.metadata && this.obj.metadata.localname) {
      label = this.obj.metadata.localname;
    }
    const heading = new Heading({
      label,
      citation: this.obj.citation
    })
    return (
      <ldf-heading doc={heading}>
        {this.obj.metadata && this.obj.metadata.latinname && <h5 slot='additional'>{this.obj.metadata.latinname}</h5>}
      </ldf-heading>
    )
  }

  // Render
  render() {
    const includeAntiphon : boolean = this.obj.includeAntiphon();

    return (
      <Host lang={this.obj.language}>
        {/* Slot for controls*/}
        <ldf-label-bar>
          <slot slot='end' name='controls'></slot>
        </ldf-label-bar>

        {/* Heading */}
        {this.headingNode()}

        {/* opening antiphon */}
        {includeAntiphon && this.antiphonNode(this.obj.metadata.antiphon)}

        {/* render each set of verses */}
        {this.filteredValue && this.filteredValue.map((section, sectionIndex) =>
          // build a set of verses
          <div class='psalm-set'>
          {section.map((verse, verseIndex) => {
            // build each verse
            if(verse instanceof Heading) {
              // for e.g., the Benedicite, Heading passed at head of section
              return <ldf-label doc={verse}></ldf-label>;
            } else {
              // otherwise, it's a normal psalm verse
              const nodes : JSX.Element[] = new Array();

              // 1st half of verse
              nodes.push(
                <div class='verse'>
                  {this.editable ?
                  <ldf-editable-text
                    id={`${this.obj.uid || this.obj.slug}-${sectionIndex}-${verseIndex}-verse`}
                    text={verse.verse}
                    path={`${this.path}/value/${sectionIndex}/${verseIndex}/verse`}
                    placeholder='Lorem ipsum sit dolor amet, *'>
                  </ldf-editable-text> :
                  <ldf-string text={verse.verse}
                    citation={{book: 'Psalm', chapter: this.obj.metadata && this.obj.metadata.number, verse: verse.number}}
                    dropcap={verseIndex == 0 ? 'force' : 'disabled'}
                    index={verseIndex}>
                  </ldf-string>}
                </div>
              );

              nodes.push(<br/>);

              // 2nd half of verse
              nodes.push(
                <div class='halfverse'>
                  {this.editable ?
                  <ldf-editable-text
                    id={`${this.obj.uid || this.obj.slug}-${sectionIndex}-${verseIndex}-halfverse`}
                    text={verse.halfverse}
                    path={`${this.path}/value/${sectionIndex}/${verseIndex}/halfverse`}
                    placeholder='consectetur adipiscing elit.'>
                  </ldf-editable-text> :
                  <ldf-string text={verse.halfverse}
                    citation={{book: 'Psalm', chapter: this.obj.metadata && this.obj.metadata.number, verse: verse.number}}
                    dropcap='disabled'>
                  </ldf-string>}
                </div>
              );

              // render the verse
              return (
                <p class={this.editable ? 'psalm editable' : 'psalm'}>
                  {this.editable ?
                  <ldf-editable-text
                    id={`${this.obj.uid || this.obj.slug}-${sectionIndex}-${verseIndex}-number`}
                    text={verse.number}
                    path={`${this.path}/value/${sectionIndex}/${verseIndex}/number`}
                    placeholder='#'>
                  </ldf-editable-text> :
                  <sup>{verse.number}</sup>}
                  <div class='text'>{nodes}</div>
                </p>
              );
            }
          })}

          {/* at the end of each set, repeat the antiphon */}
          {
            this.obj.repeatAntiphon(sectionIndex, this.filteredValue.length)
            && <div class='repeat-antiphon'>{this.antiphonNode(this.obj.metadata && this.obj.metadata.antiphon)}</div>
          }
          {includeAntiphon && this.antiphonNode(this.obj.metadata && this.obj.metadata.antiphon)}
          </div>
        )}

      {/* include the Gloria Patri */}
      {this.obj.metadata && this.obj.metadata.gloria && !this.obj.metadata.omit_gloria && this.gloriaNode(this.obj.metadata.gloria)}

      {/* include closing antiphon */}
      {includeAntiphon && this.antiphonNode(this.obj.metadata && this.obj.metadata.antiphon)}
      </Host>
    )
  }
}
