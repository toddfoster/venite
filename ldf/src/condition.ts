import { LiturgicalDay, ClientPreferences } from '.';

export class Condition {
  // `only` is only an array of values, any of which makes the condition true
  // `except` is always an array of values, any of which makes the condition false

  // `LiturgicalDay.slug` is...
  day?: {
    except?: string[];
    only?: string[];
  }

  // `LiturgicalDay.season` or `LiturgicalDay.week.season` is...
  season?: {
    except?: string[];
    only?: string[];
  }

  // Day is a feast day or a Sunday
  feastDay?: boolean;

  // Day is a particular day of the week, in English
  // 'Monday', 'Tuesday', 'Wednesday', etc.
  weekday?: {
    except?: string[];
    only?: string[];
  }

  // Day is before or after a certain date (less than, less than or equal, etc.)
  date?: {
    lt?: string;  // each stored as 'MM/DD'
    lte?: string;
    gt?: string;
    gte?: string;
  }

  // The value of the preference `key` is `value`. If `is == false`, true if the preference is *not* that value.
  preference?: {
    key: string;
    value: any;
    is: boolean;
  };

  /** Given a liturgical day and a set of preferences, evaluates whether the condition should be included */
  include(day : LiturgicalDay, prefs : ClientPreferences = {}) : boolean {
    let include : boolean = true,
        evaluatedConditions : boolean[] = new Array(include);

    // approach: for every possible condition included, push its truth
    // onto evaluatedConditions — then reduce the array and require each condition given to be true

    // `day`, `season`, and `weekday` each operate on an except/only pattern

    // `day`: is day.slug in the `only` list (and not in the `except` list)?
    this.exceptOnlyFactory('day' as 'day', day.slug, evaluatedConditions);

    // `weekday`:
    this.exceptOnlyFactory('weekday' as 'weekday', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day.getDate().getDay()], evaluatedConditions);

    // `season`: is day.week.season (the 'base season' for e.g., a saints' day in Lent)
    // or day.season (the actual season being observed) in the `only` list (and not in `except`)?
    if(this.hasOwnProperty('season') && this.season !== undefined) {
      if(this.season.except !== undefined) {
        evaluatedConditions.push(!this.season.except.includes(day.season));
        evaluatedConditions.push(!this.season.except.includes(day.week.season));
      }
      if(this.season.only !== undefined) {
        evaluatedConditions.push(this.season.only.includes(day.season) || this.season.only.includes(day.week.season));
      }
    }

    // `feastDay`
    if(this.hasOwnProperty('feastDay') && this.feastDay !== undefined) {
      const highestFeastRank : number = Math.max(   // highest rank of holy days given
        ...(day.holy_days || []).filter(a => !!a)           // exclude any null or undefined from array
            .map(a => (a && a.type && a.type.rank) ? a.type.rank : 3) // if rank is undefined, holy days default to 3
      ),
          isSunday : boolean = day.getDate().getDay() == 0,
          isFeast : boolean = highestFeastRank >= 3 || isSunday;
      evaluatedConditions.push(isFeast == this.feastDay);
    }

    // `date`
    if(this.hasOwnProperty('date') && this.date !== undefined) {
      const liturgyDate = day.getDate();

      for(const property in this.date) {
        try {
          const [month, date] = (this.date[property as 'lt' | 'lte' | 'gt' | 'gte'] || '').split('/'),
                conditionDate = new Date(liturgyDate.getFullYear(), parseInt(month) - 1, parseInt(date));

          if(property == 'lt') {
            evaluatedConditions.push(liturgyDate.getTime() < conditionDate.getTime());
          } else if(property == 'lte') {
            evaluatedConditions.push(liturgyDate.getTime() <= conditionDate.getTime());
          } else if(property == 'gt') {
            evaluatedConditions.push(liturgyDate.getTime() > conditionDate.getTime());
          } else if(property == 'gte') {
            evaluatedConditions.push(liturgyDate.getTime() >= conditionDate.getTime());
          }
        } catch(e) {
          throw "Date is formatted incorrectly (should be MM/DD)."
        }
      }
    }

    // `preference`
    if(this.hasOwnProperty('preference') && this.preference !== undefined) {
      if(this.preference.is) {
        evaluatedConditions.push(prefs[this.preference.key] == this.preference.value);
      } else {
        evaluatedConditions.push(prefs[this.preference.key] !== this.preference.value);
      }
    }

    return evaluatedConditions.reduce((a, b) => a && b);
  }

  exceptOnlyFactory(property : 'day' | 'season' | 'weekday', include : string, evaluatedConditions : boolean[]) {
    const obj = this[property];

    if(obj !== undefined) {
      if(obj.except) {
        evaluatedConditions.push(!obj.except.includes(include));
      }
      if(obj.only) {
        evaluatedConditions.push(obj.only.includes(include));
      }
    }
  }

  //** Constructor takes a Javascript object containing the class's properties */
  constructor(data: Partial<Condition> = {}) {
    Object.assign(this, data);
  }
}
