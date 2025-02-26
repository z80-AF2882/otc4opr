# OTC4OPR

## Goal
OTC4OPR is a TamperMonkey script that seamlessly renames units, weapons, and special abilities in *OPR Force Builder* to match a different universe. This allows players to enjoy the OPR ruleset while keeping familiar lore or integrating their favorite settings.

## Installation
1. **Install TamperMonkey**: Ensure you have the TamperMonkey extension installed in your preferred web browser.
2. **Create a new TamperMonkey script**: Open TamperMonkey and create a new user script.
3. **Copy the script**: Copy the content of `otc4opr.js` into the new script.
4. **Save it!**: Don't forget to save it after copy ;-)
4. **Check demo in OPR Force Builder**:
    - Open sample army https://army-forge.onepagerules.com/share?id=S1EQwJX5GPrF
    - Ruleset for this is hardcoded in user script. If it works you should see renamed units and print version of page also looks bit different comparing to stock OPR sheet.
5. **Modify script settings**: Edit the top portion of the script to adjust its settings as needed.
6. **Create own repository file**: Based on your needs create repository file. Please use example or detailed description from below.
7. **Use in OPR Force Builder**:
    - Open your army in force builder
    - Click *View List* (eye icon in the top-right corner).
    - Ensure *Cards View* is enabled.
    - If you do not have a ruleset hardcoded in the script, you will be prompted to provide a local file with rulesets.
  
**Hint:** if script did not run, reloading page (pressing F5) sometimes help. Also script generates INFO and DEBUG messages into web browser's dev console.

## Working example local repository file
- In this example repository contains only one ruleset to _reskin_ AOFS Beastmen to Gnoll army from ficticious game.
- It contains one "complication": when renaming "Hand Weapons" use "Longswords" for "Ndoli Warriors" and "Short swords" for "Waheni Reiders".
- Link to the list is https://army-forge.onepagerules.com/share?id=S1EQwJX5GPrF
```
[
    {
        pattern: "@Beastmen",
        color: "#806633",
        datacardRenames: [
            "Ndoli Beast Lord => Gnoll Alpha",
            "Ndoli Elite => Gnoll Beta",
            "Ndoli Warriors # Spears => Gnoll Spearmen",
            "Ndoli Warriors => Gnoll Warriors",
            "Waheni Raiders => Gnoll Skirmishers",
        ],
        weaponRenames: [
            "Heavy Great Weapon => Terrifing Maul",
            "Heavy Hand Weapon => Ritual Knife",
            {
                predicate: "Hand Weapons",
                action: (target) =>
                    target.datacard.name === "Ndoli Warriors" ? "Longswords" : "Short swords"
            }
        ]
    },
]
```

## How It Works

_This is bit technical but it's necessary. Whole solution is less then user friendly. But it's simple and it (mostly) works. Sorry._

1. The script is triggered when a user opens a URL starting with `https://army-forge.onepagerules.com/view?listId=`.
2. The script waits for a set period to allow the page to load completely.
    - The grace period can be adjusted in the script settings by chaning value of constant `OTC4OPR_GRACE_PERIOD` to what ever millisecond value you like.
    - This is sub-optimal way to observe web page state, but it works.
3. Minor style adjustments are applied to web page:
    - Datasheet headers and table headers get custom colors.
    - Borders are added around datacards.
    - These modifications can be disabled in the script settings by changing value of constant `OTC4OPR_UPDATE_CSS` to false.
4. The script parses unit datacards from web page (see *Data Model* section).
5. List name, army book name, and army book version is parsed from web page.
6. A _ruleset_ is selected from _ruleset repository_ based on the list name and army book name and army book version.
    - For more details, see *Ruleset Selection*.
    - If no ruleset is found, the user is prompted to provide one from a local file.
    - **Warning**: It is a JavaScript file that will be evaluated in your browser. Use only what you trust.
7. The ruleset is applied to each datacard, modifying unit names, weapon names, and special ability names accordingly.

## Why This Approach?
Some companies are highly protective of their intellectual property. However:
- There are no legal issues with maintaining a personal file containing renamed units.
- As long as users create their own rulesets locally, there are no restrictions.

## Ruleset Repository, Ruleset, Rule
- **Ruleset Repository** list of all Rulesets.
    - one ruleset is selected and rule by rule is applied to each datacard weapon and ability from data model extracted from web page
- **Ruleset** is list of _Rules_ split into three parts:
    - datacard rules
    - weapon rules
    - special ability rules
- **Rule** is single `IF condition THEN action` that is applied to parts of data model.
- **Datamodel** is list of Datasheets parsed from View web page in OPR Force Builder.
- **Datasheet** represents single unit with _Stats_, _Weapons_, _Special Abilities_.
- Detailed attributes / functions are below or ... in user script javadoc

## Ruleset Selection
- The _ruleset repository_ is a list of rulesets in user defined order.
- Each ruleset contains:
    - **Pattern**: Checked against list name and army book name. If it matches, the ruleset is selected and selection process stop.
    - **ID**: Unique identifier used if the ruleset is included in others.
    - **Datasheet Rules**: List of rules applied to each datacard.
    - **Weapon Rules**: List of rules applied to each weapon.
    - **Special Rules**: List of rules applied to each special ability.
- Each time a list is viewed in *OPR Force Builder*, the script scans the repository and selects the first ruleset with matching pattern. Pattern is matched using in following order:
    - "List name @ Army Book Name With Version"
    - "List name @ Army Book Name"
    - "List name"
    - "@ Army Book Name With Version"
    - "@ Army Book Name"
    - Use `*` to substitute parts of text (e.g., `@ Battle Brothers 3.*` matches all Battle Brothers in major verson 3).
- There are two ways to provide a ruleset repository:
    - **Hardcoded at the top of the script** by setting `OTC4OPR_BUILTIN_RULESET_REPOSITORY`.
        - **Pros**: No need to provide a local file each time the script runs.
        - **Cons**: Manual modification is required after script updates.
    - **Evaluated from a local JavaScript file**.
        - **Pros**: No manual modification is required after updates.
        - **Cons**: The user must provide a local file every time they view a list in *Army Force Builder*.
- The script first tries the hardcoded repository. If no match is found, it prompts for local JavaScript file with a small bar at the top of the webpage.
- The bar is visible  in case the user wants to switch to a different ruleset repository.

## Rule Definition
- A rule follows the structure: **IF predicate MATCHES target THEN action**.
- Predicate and action are part of the rule.
- Target is one of:
  - **Datasheet**
  - **Weapon**
  - **Special Ability**
- Define rules in two ways:
    - **Object format**: `{ predicate: ..., action: ... }`
        - Predicate and action can be either a string or a JavaScript function for complex logic.
    - **String format**: `"predicate string => action string"` (shorthand for `{ predicate: "predicate string", action: "action string" }`).
- Predicate in string format simply matches:
    - `"Orc Warrior => Greenskin"` - Rename *Orc Warrior* datacard to *Greenskin*
- Predicate in string format can contain additional restriction to special ability. Consider following example:
  - `"Robot Lord # Warden => Forsaken Warden"` - Rename *Robot Lord* with *Warden* special ability to  *Forsaken Warden*.
  - `"Robot Lord # Overseer => Forsaken Overseer"` - Rename *Robot Lord* with *Overseer* special ability to *Forsaken Overseer*.
  - `"Robot Lord => Forsaken Commander"` - Otherwise, renames *Robot Lord* to *Forsaken Commander*.
- Predicate as a function:
  - Example from above:
    ```
    {
        predicate: function(target) { return target.name === 'Orc Warrior' },
        action: 'Greenskin'
    }
    ```
- Action as a function:
    - Example: Renaming *Energy Pistol* to *Mega Blasting Pistol* only for *Orc Leader*:
      ```
      { 
        predicate: 'Energy Pistol', 
        action: (target) => target.datacard.name == 'Orc Leader' ?
            'Mega Blasting Pistol' : target.name 
      }
      ```

## Data Model
* **Datasheet**
  * `name`: `string` - original name of this datacard 
  * `stats`: `Stat[]`
  * `weapons`: `Weapon[]` 
  * `special`: `Special[]`
  * `datacard`: `Datasheet` - self, it makes life easier as you can sefely use target.datacard in predicate or action function 
  * `stat(str)`: `Stat` - `undefined` if stat does not exist 
  * `hasWeapon(str)`: `boolean` - true if datacard has weapon with original name str
  * `hasSpecial(str)`: `boolean`
* **Stat**
    * `name`: `string`
    * `quality`: `int`
* **Weapon**
    * `name`: `string`
    * ... all attributes of weapon including string array of special abilities
* **Special**
    * `name`: `string`
    * `description`: `string`

