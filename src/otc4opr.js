// ==UserScript==
// @name         One Thin Coat for One Page Rules
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This script is used to translate Grimdark Future OPR universe into that of other grim dark wargame to keep lore / miniatures.
// @author       Me
// @match        https://army-forge.onepagerules.com/view*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=onepagerules.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /** SETTINGS ***********************/
        // Delay in milliseconds between page load and script run.
        // Set to several seconds when running it against live page
        // Set to 0 for development
    const OTC4OPR_GRACE_PERIOD = 5000;
    const OTC4OPR_HEADER_BACKGROUND = '#cc5500';
    const OTC4OPR_TABLE_BACKGROUND = '#aaaaaa';

    // Rules
    const OTC4OPR_RULES = {
        'Robot Legions': {
            modelRenameRules: [
                'Robot Lord #Warden => Royal Warden',
                'Robot Lord #Overseer => Overseer',
                'Robot Lord => Overlord',
                'Warrior => Necron Warrior',
                'Flesh-Eater => Flayed One',
                'Bot Swarm => Canoptek Scarab Swarms',
                'Sniper => Deathmark',
            ],
            weaponRenameRules: [
                'Lord Gauss Rifle => Relic gauss blaster',
                'Reaper Rifle => Gauss flayer',
                'Metal Claw => Flayer claws',
                'Swarm Attack => Feeder mandibles',
                'D-Mark => Synaptic disintegrator',
            ]
        },
        'Blood Brothers': {
            modelRenameRules: [
                'Blood Master Brother => Lieutenant',
                'Blood Battle Brother => Tactical Marine',
                'Blood Brother Biker => Space Marine Bike',
            ],
            weaponRenameRules: [
                'Heavy Rifle => Boltgun',
                'Master Plasma Pistol => Neo-volkite pistol',
                'Energy Sword => Power sword',
                'Heavy Pistol => Bolt pistol',
            ]
        },
        'DAO': {
            modelRenameRules: [
                'Grunt Leader => Firewarrior Shas’la',
                'Grunt => Firewarrior Shas’ui',
                'Gun Drone => MV1 Gun Drone',
                'Stealth Suit => XV25 Stealth Battlesuit',
            ],
            weaponRenameRules: [
                'Leader Pulse Rifle => Pulse rifle',
                'Pulse Rifle => Pulse rifle',
                'Drone Pulse-Gun => Pulse carbine',
                'Twin Pulse-Gun => Pulse carbine',
                'Taser => CCW',
                'Rapid Burst Carbine => Burst cannon',
            ],
            specialRenameRules: [
                'Spotting Laser => Marker light',
            ]
        },
        'Alien Hives': {
            modelRenameRules: [
                'Veteran Warrior => Tyranid Warrior',
                'Hive Warrior => Tyranid Warrior',
                'Hive Swarm => Ripper Swarm',
                'Assault Grunts => Hormagaunts',
                'Shooter Grunts => Termagants',
            ],
            weaponRenameRules: [
                'Razor Claw => Scything talons',
                'Razor Claws => Scything talons',
                'Heavy Razor Claws => Scything talons',
                'Bio-Borers => Fleshborer',
                'Swarm Attack => Maws',
                'Heavy Ravager Gun => Devourer',
            ],
        }
    }
    /** STYLE CHANGE ************************/
    function overrideStyles() {
        console.info("Tampermonkey: Overriding @media print styles...");

        // Create a new style element
        const style = document.createElement("style");
        style.innerHTML = `
            @media print {
                .MuiAccordionSummary-root {
                                background-color: ${OTC4OPR_HEADER_BACKGROUND} !important;
                }
                .print-only .MuiStack-root {
                                background-color: ${OTC4OPR_HEADER_BACKGROUND} !important;
                }
                .MuiContainer-root {
                    margin-top: 1em;
                }
                thead tr {
                    background-color: ${OTC4OPR_TABLE_BACKGROUND} !important;
                    color: inherit !important;
                }
                :root {
                    --mui-shadows-1: none;
                }
                .MuiCard-root {
                    border: 1px solid black;
                }
                body {
                    padding: 10px;
                }
            }
        `;

        // Append the new style to the document head
        document.head.appendChild(style);
    }

    /** APPLICATION MODEL ***********************/
    class Stat {
        constructor(root, datacard) {
            this.root = root
            this.datacard = datacard
            let els = root.getElementsByTagName('span')
            if (els.length !== 2) {
                console.error('Expecting two elements in Stat', els)
                return
            }
            this.nameElement = els[0]
            this.name = this.nameElement.innerText
            this.valueElement = els[1]
            this.value = this.valueElement.innerText
        }
    }

    class Special {
        constructor(root, datacard) {
            this.root = root
            this.datacard = datacard
            let els = root.getElementsByTagName('span')
            if (els.length !== 2) {
                console.error('Expecting two elements in Special', els)
                return
            }
            this.nameElement = els[0]
            this.name = this.nameElement.innerText.replace(/\s+-\s*$/, "")
            this.descriptionElement = els[1]
            this.description = this.descriptionElement.innerText
        }

        changeName(newValue) {
            this.nameElement.innerText = newValue + " -"
            this.name = newValue
        }
    }

    class Weapon {
        constructor(root, datacard) {
            this.root = root
            this.datacard = datacard
            this.nameElement = root.children[0]
            let match = this.nameElement.innerText.match(/^(\d+)x\s+(.*)$/);
            if (match) {
                this.count = parseInt(match[1], 10)
                this.name = match[2]
            } else {
                this.count = 1
                this.name = this.nameElement.innerText
            }
            this.rngElement = root.children[1]
            this.rng = this.rngElement.innerText
            this.atkElement = root.children[2]
            this.atk = this.atkElement.innerText
            this.speElement = root.children[3]
            this.spe = this.speElement.innerText
        }

        changeName(newValue) {
            this.nameElement.innerText = this.count === 1 ? newValue : ('' + this.count + 'x ' + newValue)
            this.name = newValue
        }
    }

    class Upgrade {
        constructor(root, datacard) {
            this.root = root
            this.datacard = datacard
            this.nameElement = root.children[0]
            this.name = this.nameElement.innerText
            this.speElement = root.children[1]
            this.spe = this.speElement.innerText
        }
    }

    class Datacard {
        constructor(root) {
            this.root = root
            this.datacard = this
            this.headerElement = root.children[0]?.getElementsByTagName('p')?.item(0)
            this.name = this.headerElement.innerText.match(/(?:\d+x\s*)?(.+?)\s*\[\d+].*/)[1];
            let tail = root.children[1];

            let statsElementsContainer = uniqCN(tail, 'MuiStack-root')
            let statsElements = statsElementsContainer.getElementsByClassName('MuiBox-root')
            let datacard = this
            this.stats = new Map(
                createAll(statsElements, (root) => new Stat(root, datacard))
                    .map(stat => [stat.name.replace(/\s+/g, '_').toLowerCase(), stat])
            )

            let specialElementsContainer = statsElementsContainer.nextElementSibling
            if (!specialElementsContainer.classList.contains('MuiBox-root')) {
                console.error('Unable to retrieve special container', specialElementsContainer)
            }
            let spacialElements = specialElementsContainer.getElementsByTagName('p')
            this.specials = new Map(
                createAll(spacialElements, (root) => new Special(root, datacard))
                    .map(spe => [spe.name.toLowerCase(), spe])
            )
            let tables = tail.getElementsByTagName('table')
            let weaponElementsContainer = tables[0].getElementsByTagName('tbody')[0]
            let weaponElements = weaponElementsContainer.getElementsByTagName('tr')
            this.weapons = createAll(weaponElements, (root) => new Weapon(root, datacard))
            if (tables.length > 1) {
                let upgradeElementContainer = tables[1].getElementsByTagName('tbody')[0]
                let upgradeElements = upgradeElementContainer.getElementsByTagName('tr')
                this.upgrades = new Map(
                    createAll(upgradeElements, (root) => new Upgrade(root, datacard))
                        .map(upgrade => [upgrade.name.toLowerCase(), upgrade])
                )
            } else {
                this.upgrades = {}
            }
        }

        hasUpgrade(name) {
            return this.upgrades.has(name.toLowerCase())
        }

        changeName(newValue) {
            this.headerElement.innerText = this.headerElement.innerText.replace(this.name, newValue);
        }

        static create(root) {
            let sub = root.getElementsByClassName('MuiPaper-root');
            if (sub.length !== 0) {
                return null;
            }

            return new Datacard(root);
        }
    }

    function uniqCN(container, className) {
        let result = container.getElementsByClassName(className)
        if (result.length !== 1) {
            console.error("Element with className " + className + " not found or not unique in container", container, result)
            return undefined
        }
        return result[0]
    }

    function uniqTag(container, tagName) {
        let result = container.getElementsByTagName(tagName)
        if (result.length !== 1) {
            console.error("Element with tag name " + tagName + " not found or not unique in container", container, result)
            return undefined
        }
        return result[0]
    }

    function createAll(elements, c) {
        return Array.from(elements).map(c).filter(o => o !== null);
    }

    /** RENAMING FUNCTIONALITY ******************/
    function parsePredicate(predicate) {
        if (typeof predicate === 'function') {
            return predicate
        }
        if (typeof predicate !== 'string') {
            console.error("Unknown predicate", predicate)
            return
        }
        predicate = predicate.toLowerCase().trim()
        let predicateSplit = predicate.split(/\s*#\s*/)
        if (predicateSplit.length > 1) {
            let name = predicateSplit[0].toLowerCase().trim()
            let upgrade = predicateSplit[1].toLowerCase().trim()
            return function (target) {
                return target.name.toLowerCase() === name && target.datacard.hasUpgrade(upgrade);
            }
        } else {
            return function (target) {
                return target.name.toLowerCase() === predicate;
            }
        }
    }

    function parseAction(action) {
        if (typeof action === 'function') {
            return action
        }
        if (typeof action !== 'string') {
            console.error("Unknown action", action)
            return
        }
        return function (datacard, target) {
            return action;
        }
    }

    /**
     * Represents single rename rule: IF predicate THEN action
     *
     **/
    class RenameRule {
        /**
         *
         * @param pa one of object with predicate, action properties, string representation fo predicate action
         * @returns {function(): string}
         */
        constructor(pa) {
            var predicate = undefined;
            var action = undefined;
            if (typeof pa === 'string') {
                let paSplit = pa.split(/\s=>\s/)
                this.predicate = parsePredicate(paSplit[0])
                this.action = parseAction(paSplit[1])
            } else if (typeof pa === 'object') {
                this.predicate = parsePredicate(pa.predicate)
                this.action = parseAction(pa.action)
            } else {
                console.error('Unrecognized predicate-action', pa)
            }
            console.debug("RenameRule", this.predicate, this.action)
        }

        apply(target) {
            if (this.predicate(target)) {
                let newName = this.action(target)
                target.changeName(newName)
                return true
            }

            return false
        }
    }

    function escapeRegex(string) {
        return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    function makeGlobPattern(str) {
        if (!str) {
            return false
        }

        return new RegExp('^' + escapeRegex(str).replace(/\s+/, ' ').replace('\\*', '.*').trim() + '$', 'i')
    }


    function createRulesetPredicate(rulesetObject) {
        let predicate = rulesetObject.predicate
        let pattern = rulesetObject.pattern
        if (predicate && pattern) {
            console.error("Both pattern and predicate are defined. Pick one!", rulesetObject)
            return () => false
        }
        if (typeof predicate === 'function') {
            return predicate
        }
        if (typeof pattern === 'string') {
            let patternSplit = pattern.split('@')
            let forceNamePattern = makeGlobPattern(patternSplit[0].trim())
            let bookNamePattern = makeGlobPattern(patternSplit.length > 1 ? patternSplit[1].trim() : undefined)
            return function(header) {
                if (!forceNamePattern && !bookNamePattern) {
                    return false
                }
                if (forceNamePattern && !forceNamePattern.test(header.forceName)) {
                    return false
                }
                if (bookNamePattern && !(bookNamePattern.test(header.bookName) || bookNamePattern.test(header.bookFullName))) {
                    return false
                }
                return true

            }
        }
        console.error("Ruleset must have predicate function, pattern string set.", rulesetObject)
        return () => false
    }


    class RenameRuleset {
        constructor(rulesetObject) {
            this.predicate = createRulesetPredicate(rulesetObject)
            this.color = rulesetObject.color || undefined
            this.modelRenameRules = (rulesetObject.modelRenameRules || []).map(pa => new RenameRule(pa))
            this.weaponRenameRules = (rulesetObject.weaponRenameRules || []).map(pa => new RenameRule(pa))
            this.specialRenameRules = (rulesetObject.specialRenameRules || []).map(pa => new RenameRule(pa))
        }

        apply(datacard) {
            for (let change of this.modelRenameRules) {
                if (change.apply(datacard)) {
                    break;
                }
            }

            for (let weapon of datacard.weapons) {
                for (let change of this.weaponRenameRules) {
                    if (change.apply(weapon)) {
                        break;
                    }
                }
            }

            for (let [name, special] of datacard.specials) {
                for (let change of this.specialRenameRules) {
                    if (change.apply(special)) {
                        break;
                    }
                }
            }
        }
    }

    /** SIMPLE UI *************************/
    function showMessage(message, actions) {
        // Check if a container already exists; if not, create one at the top of the page.
        let container = document.getElementById('message-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'message-container';
            container.style.width = '100%';
            container.style.backgroundColor = '#f0f0f0';  // light background color
            container.style.padding = '10px';
            container.style.borderBottom = '1px solid #ccc';
            // Insert at the very top of the body
            document.body.insertBefore(container, document.body.firstChild);
        }

        // Set the inner HTML to the message text.
        container.innerHTML = message;

        // If actions are provided, render each as a link after the message text.
        if (actions && typeof actions === 'object') {
            for (let label in actions) {
                if (actions.hasOwnProperty(label)) {
                    // Create a link for each action.
                    let actionLink = document.createElement('a');
                    actionLink.href = '#';
                    actionLink.textContent = label;
                    actionLink.style.marginLeft = '10px';
                    // Attach the callback to the link click event.
                    (function(callback) {
                        actionLink.addEventListener('click', function(event) {
                            event.preventDefault();
                            callback();
                        });
                    })(actions[label]);

                    // Append the action link to the container.
                    container.appendChild(actionLink);
                }
            }
        }
    }

    function selectRuleset(header) {
        return undefined
    }

    /** MAIN ******************************/
    function fourtify() {
        console.info('Changing print CSS styles')
        overrideStyles()

        let header = parseHeader()
        let datacards = parseDatacards()

        console.info('Renaming')
        let ruleSet = selectRuleset(header)

        if (!ruleSet) {

        }


        let rename = new RenameRuleset(header.bookName)
        for (let datacard of datacards) {
            rename.apply(datacard)
        }
    }

    function parseDatacards() {
        console.info("Parsing datacards ...")
        let datacardsContainerElement = uniqCN(document, 'MuiContainer-root')
        let datacardRoots = datacardsContainerElement.getElementsByClassName("MuiPaper-root")
        let result = createAll(datacardRoots, Datacard.create)
        console.info("Parsed datacards", result)
        return result
    }

    function parseHeader() {
        console.info("Parsing headers ...")
        let headerElement = uniqCN(document, 'print-only')
        let forceNameElement = uniqTag(headerElement, 'h1')
        let forceNameSplit = forceNameElement.innerText.split(/\s•\s/)
        let bookNameElement = uniqTag(headerElement, 'h4')
        let bookNameSplit = bookNameElement.innerText.match(/(.*)\s[\d\.]+/)
        let result = {
            forceName: forceNameSplit[0],
            bookFullName: bookNameSplit[0],
            bookName: bookNameSplit[1],
        }
        console.info("Parsed header", result)
        return result
    }

    const inTamperMonkey = typeof GM_info !== 'undefined'
    const hasModuleExports = typeof module !== 'undefined' && typeof module.exports

    if (!inTamperMonkey && hasModuleExports) {
        console.info("Running tests")
        module.exports = { makeGlobPattern, createRulesetPredicate }
        return
    }

    if (OTC4OPR_GRACE_PERIOD > 0) {
        console.log("Preparing to apply thin coat in ", OTC4OPR_GRACE_PERIOD)
        setTimeout(fourtify, OTC4OPR_GRACE_PERIOD)
    } else {
        console.log("Applying this coat NOW!")
        fourtify()
    }

})();