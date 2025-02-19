import { LiturgicalDay } from './calendar/liturgical-day';
import { ResponsivePrayerLine } from './responsive-prayer';
import { BibleReadingVerse } from './bible-reading/bible-reading-verse';
import { Heading } from './heading';
import { Citation } from './citation/citation';
import { PsalmSection } from './psalm';
import { Sharing } from './sharing/sharing';
import { Condition } from './condition';
import { ClientPreferences } from './liturgy/client-preferences';
import { DisplaySettings } from './display-settings';

export enum Responsive {
  AllSizes = 'all',
  SmallOnly = 'small-only',
  SmallHidden = 'small-hidden',
}

const TYPES = [
  'liturgy',
  'heading',
  'option',
  'refrain',
  'rubric',
  'text',
  'responsive',
  'bible-reading',
  'psalm',
  'meditation',
  'image',
  'parallel',
] as const;
export type TypeTuple = typeof TYPES;

const LOOKUP_TYPES = ['lectionary', 'canticle', 'category', 'slug', 'collect'];
type LookupTypeTuple = typeof LOOKUP_TYPES;

export type Lookup = {
  type: LookupTypeTuple[number];
  /** Lectionary or canticle table name */
  table?: string | { preference: string };
  /** Reading type to search
   * To search on slug or category, use the actual `slug` or `category` of this document */
  item?: string | number | { preference: string };
  /** Filter results based on `LiturgicalDay.season`, `LiturgicalDay.slug`, or `Liturgy.evening` */
  filter?: 'seasonal' | 'evening' | 'day';
  /** If `true`, rotate through the possibilities and gives only one, rotating by day */
  rotate?: boolean;
  /** If `true` and `rotate` == true, rotate pseudo-randomly */
  random?: boolean;
  /** If `true`, allows multiple options; if `false`, returns the first option (used for collects at the Eucharist) */
  allow_multiple?: boolean;
};

export type Value =
  | LiturgicalDocument[]
  | ResponsivePrayerLine[]
  | (BibleReadingVerse | Heading)[]
  | PsalmSection[]
  | string[];
export type ValuePiece =
  | LiturgicalDocument
  | ResponsivePrayerLine
  | BibleReadingVerse
  | Heading
  | PsalmSection
  | string;

const DISPLAY_FORMATS = ['default', 'omit', 'unison', 'abbreviated', 'force_dropcap'];
type DisplayFormatTuple = typeof DISPLAY_FORMATS;
export type DisplayFormat = DisplayFormatTuple[number];

/** Represents a liturgy of any scope and concreteness, from a complete bullletin to a single prayer. */
export class LiturgicalDocument {
  /** If provided from a database, `id` is unique identifier/DB primary key */
  id?: number | string;

  /** Timestamps for document creation and modification */
  date_created?: any;
  date_modified?: any;

  /** Indicates the type of document */
  type: TypeTuple[number];

  /** An optional string that clarifies the variety; for example, a `Text` could be of the `prayer` style. */
  style?: string | null;

  /** Specify how the text should be displayed
   * Unison: the entire text is a congregational response
   * Abbreviated: only the beginning and end of the text should be displayed
   * Responsive: alternating parts (for psalms, by verse)
   * Antiphonal: alternating parts (for psalms, by half-verse)
   */
  display_format?: DisplayFormat;

  /** Display Settings (font, etc.) to be applied to the document as a whole */
  display_settings?: DisplaySettings;

  /** Category tags allow searches for things like 'Psalm', 'Canticle', 'Confession', 'Eucharist'. */
  category: string[];

  /** An array of `Conditions`s determining whether the document should be displayed, given its day. */
  condition: {
    mode: 'and' | 'or';
    conditions: Condition[];
  };

  /** The URL (as a string) for the API that provided the document, or against which it can be compiled.
   */
  api?: string;

  /** Permissions for this document: whether it's public, shared with particular individuals, etc. */
  sharing?: Sharing;

  /** Version number of the document */
  lastRevision: number;

  /** An identifying slug. Given the `slug`, the API should be able to identify this document.
   * @example
   * `'morning_prayer'`, `'lords_prayer'`
   */
  slug: string;

  /** A human-readable name; either the name of the whole liturgy, or a label for a piece.
   * @example
   * `'Morning Prayer'`, `'The Apostles’ Creed'`
   */
  label: string;

  /** Optional: A human-readable name for this particular version of a larger category of prayer or liturgy.
   * @example
   * `'Lord’s Prayer (Traditional)'`
   */
  version_label?: string | null;

  /** Language code (typically an ISO 639-1 two-letter code)
   * @example
   * `'en'`
   */
  language: string;

  /** Identifying code for the version of a liturgy, prayer, psalm, or Bible reading.
   * @example
   * `'Rite-II'`, `'bcp1979'`, `'coverdale'`, `'NRSV'`, `{ preference: "bibleVersion" }`
   */
  version: string | { preference: string };

  /** Biblical or other citation for the document.
   * @example
   * `John 1:14` */
  citation?: string | null;

  /** Source for the physical resource within which the document can be found
   * @example
   * { source: 'bcp1979', 'citation': 'p. 123' } */
  source?: Citation | null;

  /** Optional: A unique identifying string based on the slug, for compiled liturgies with multiple instances of the same prayer.
   * @example
   * `'gloria_patri_0'`, `'gloria_patri_1'`
   */
  uid?: string;

  /** Optional: The liturgical day against which to compile the value, or against which a liturgy has been compiled.
   * {@link LiturgicalDay}
   */
  day?: LiturgicalDay;

  /** Optional: Child classes can store any additional properties they need within the `metadata` object.
   * @example
   * { response: 'Thanks be to God.' }
   */
  metadata?: any;

  /** Marks a document hidden, so it will not display but will not be deleted
   * Typically used to a hide a subdocument within a larger liturgy without removing it entirely from the structure,
   * making it easier to restore or toggle on and off */
  hidden?: boolean;

  /** Marks a piece of a document that should be hidden after the document is compiled.
   * This can be used for e.g., explanatory rubrics that become redundant once a reading or psalm has been inserted. */
  compile_hidden?: boolean;

  /** Instructs the client to look up more information from the server
   * @example
   * // the 1st canticle in the 1979 BCP table for the current `LiturgicalDay`
   * { type: 'psalm', style: 'canticle', lookup: { table: 'bcp1979', item: 1 }}
   * @example
   * // the morning psalms in the 30-day BCP cycle
   * { type: 'psalm', style: 'canticle', lookup: { table: 'bcp_30day_psalter', item: 'morning_psalms' }}
   * @example
   * // the gospel reading in the Revised Common Lectionary
   * { type: 'bible-reading', style: 'long', lookup: { table: 'rcl', item: 'gospel' }} */
  lookup?: Lookup;

  /** Documents can be set to show only on mobile or only on larger-than-mobile
   * e.g., a hymn could show only the scanned image on tablet, and only the text on mobile */
  responsive?: Responsive | undefined;

  /** The content of the document. */
  value?: Value;

  /** Evaluates the full set of conditions attached to the document and returns a boolean of whether it should be included
   * given the day and assigned preferences  */
  include(day: LiturgicalDay, prefs: ClientPreferences = {}): boolean {
    if (this.condition !== undefined) {
      const evaluatedConditions: boolean[] = (this.condition.conditions || []).map((condition) => {
        if (!(condition instanceof Condition)) {
          condition = new Condition(condition);
        }
        return condition.include(day || this.day, prefs);
      });

      //console.log(evaluatedConditions);

      if (this.condition.mode == 'or') {
        return evaluatedConditions.reduce((a, b) => a || b, false);
      } else {
        return evaluatedConditions.reduce((a, b) => a && b, true);
      }
    } else {
      return true;
    }
  }

  /** Returns the list of all possible `type` values */
  availableTypes(): ReadonlyArray<string> {
    return TYPES;
  }

  /** Returns the list of all possible `style` values. Child classes should override if they have styles available. */
  availableStyles(): ReadonlyArray<string> {
    return [];
  }

  /** Returns the list of all possible `lookup.type` values */
  availableLookupTypes(): ReadonlyArray<string> {
    return LOOKUP_TYPES;
  }

  /** Returns the list of all available `display_format` values */
  availableDisplayFormats(): ReadonlyArray<string> {
    return DISPLAY_FORMATS;
  }

  //** Constructor takes a Javascript object containing the class's properties */
  constructor(data: Partial<LiturgicalDocument> = {}) {
    Object.assign(this, data);
  }
}
