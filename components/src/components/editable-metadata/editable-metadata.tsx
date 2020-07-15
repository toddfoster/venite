import { Component, Element, Prop, Watch, State, Host, FunctionalComponent, h } from '@stencil/core';
import { LiturgicalDocument, specificClass } from '@venite/ldf';
import { getLocaleComponentStrings } from '../../utils/locale';

@Component({
  tag: 'ldf-editable-metadata',
  styleUrl: 'editable-metadata.scss',
  shadow: true
})
export class EditableMetadataComponent {
  @Element() element : HTMLElement;

  // States
  @State() obj : LiturgicalDocument;
  @State() localeStrings: { [x: string]: string; };
  @State() collapsedState : boolean;

  // Properties
  /**
   * An LDF LiturgicalDocument object
   */
  @Prop() doc : LiturgicalDocument | string;
  @Watch('doc')
  docChanged(newDoc : LiturgicalDocument | string) {
    try {
      if(typeof newDoc == 'string') {
        this.obj = specificClass(JSON.parse(newDoc));
      } else {
        this.obj = specificClass(newDoc);
      }
    } catch(e) {
      console.warn(e);
      this.obj = new LiturgicalDocument();
    }
  }

  /** A JSON Pointer that points to the LiturgicalDocument being edited */
  @Prop({ reflect: true }) path : string;

  /** If `visible` is true, the controls should appear. */
  @Prop() visible : boolean;

  /** If `collapsed` is false, the full set of editable fields will appear. */
  @Prop() collapsed : boolean;

  /** Used to pass in the `IonModal` we will dismiss */
  @Prop() modal : any;

  // Lifecycle events
  componentWillLoad() {
    this.docChanged(this.doc);
    this.collapsedState = this.collapsed;
    this.loadLocaleStrings();
  }

  // Private methods
  /** Asynchronously return localization strings */
  async getLocaleStrings() : Promise<{ [x: string]: string; }> {
    if(!this.localeStrings) {
      await this.loadLocaleStrings();
      return this.localeStrings;
    } else {
      return this.localeStrings;
    }
  }

  /** Asynchronously load localization strings */
  async loadLocaleStrings() : Promise<void> {
    try {
      this.localeStrings = await getLocaleComponentStrings(this.element);
    } catch(e) {
      console.warn(e);
    }
  }


  // Render
  render() {
    const localeStrings = this.localeStrings || {},
          availableTypes = this.obj.availableTypes() || [],
          availableStyles = this.obj.availableStyles() || [];

    /** <SelectField/> Functional Component */
    interface SelectFieldProps {
      field: string;
      types: ReadonlyArray<string>
    }
    const SelectField : FunctionalComponent<SelectFieldProps> = ({ field, types }) => (
      <ion-item lines='none'>
        <ion-label arial-label={localeStrings[field]} position='stacked'>{localeStrings[field]}</ion-label>
        <ldf-editable-select id={field}
          path={this.path}
          property={field}
          value={this.obj[field]}
          options={types.map(value => ({ value, label: localeStrings[value] || value }))}>
        </ldf-editable-select>
      </ion-item>
    );

    const TextField : FunctionalComponent<{ name }> = ({ name }) => (
      <ion-item lines='none'>
        <ion-label aria-label={localeStrings[name]} position='stacked'>{localeStrings[name]}</ion-label>
        <ldf-editable-text id={name}
          short={true}
          path={`${this.path}/${name}`}
          text={this.obj[name]}
          placeholder={localeStrings[name]}>
        </ldf-editable-text>
      </ion-item>
    )

    return (
      <Host>
        <ion-header>
          <ion-toolbar>
            <ion-title>{ localeStrings.modalTitle }</ion-title>
            <ion-buttons slot="primary">
              <ion-button onClick={() => this.modal.dismiss(null)}>
                <ion-icon slot="icon-only" name="close"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          {/* Form to Edit Metadata — display when "Settings" button is toggled */}
          <form class={{ metadata: true, hidden: this.collapsedState, visible: !this.collapsedState }}>
            <ion-card>
              <ion-card-header>
                <ion-card-title>{localeStrings.title}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-grid>
                  {/* `type` and `style` */}
                  <ion-row>
                    <ion-col size="4">
                      <SelectField field='type' types={availableTypes} />
                    </ion-col>
                    <ion-col>
                      {availableStyles && availableStyles.length > 0 && <SelectField field='style' types={availableStyles} />}
                    </ion-col>
                  </ion-row>
                  {/* `tradition`, `language` and `version` */}
                  <ion-row>
                    <ion-col><TextField name="tradition"/></ion-col>               
                    <ion-col><TextField name="language"/></ion-col>
                    <ion-col><TextField name="version"/></ion-col>
                  </ion-row>
                  {/* `label` and `version_label` */}
                  <ion-row>
                    <ion-col size="4"><TextField name="label"/></ion-col>
                    <ion-col><TextField name="version_label"/></ion-col>
                  </ion-row>
                  {/* `source` and `citation` */}
                  <ion-row>
                    <ion-col size="8"><ion-item lines="none"><p>Source...</p></ion-item></ion-col>
                    <ion-col><TextField name="citation"/></ion-col>
                  </ion-row>
                  {/* `category` */}
                  <ion-row>
                    <ion-col size="12">
                      <ldf-editable-string-list
                        path={this.path}
                        property="category"
                        value={this.obj.category}
                      >
                      </ldf-editable-string-list>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </ion-card-content>
            </ion-card>
            {/* `metadata` */}
            <ldf-editable-metadata-metadata-fields
              path={this.path}
              doc={this.obj}
            ></ldf-editable-metadata-metadata-fields>
          </form>
        </ion-content>
      </Host>
    );
  }
}
