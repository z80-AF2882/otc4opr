// ==UserScript==
// @name         One Thin Coat for One Page Rules
// @namespace    https://github.com/z80-AF2882/otc4opr
// @version      0.0.1
// @description  This script is used to translate OPRs GDF or AOF universe into that of other grim wargame to keep lore / miniatures.
// @author       AF
// @match        https://army-forge.onepagerules.com/view*
// @match        https://army-forge.onepagerules.com/share*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=onepagerules.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    const OTC4OPR = 'OTC4OPR'
    const inTamperMonkey = typeof GM_info !== 'undefined'

    if (inTamperMonkey) {
        console.info(OTC4OPR, `Starting userscript ${GM_info.name}`)
    }

    ////////////////////
    //#region SETTINGS
    ////////////////////
    /** Time between loading page and starting replacements on web page */
    const OTC4OPR_GRACE_PERIOD = 5000;
    /** Do not update css style of web page */
    const OTC4OPR_UPDATE_CSS = true
    /** Default background color used in datacard header, if ruleset does not provide one*/
    const OTC4OPR_HEADER_BACKGROUND = '#cc5500';
    /** Background color used in table headers */
    const OTC4OPR_TABLE_BACKGROUND = '#aaaaaa';

    /**
     *  HARDCODED RULESET REPOSITORY
     *
     * When looking up ruleset, this repository is checked first. If no ruleset is found,
     * user is prompted to provide ruleset repository from local file.
     *
     * Original value contains repository with single ruleset for demo force
     * at https://army-forge.onepagerules.com/share?id=S1EQwJX5GPrF
     *
     * You can use it to check if all is working.
     *
     * Feel free to replace it with your own. As a benefit you won't need to use file
     * from local filesystem. Drawback is that you have to preserve value during update
     * to new version of this script ... if ever :-)
     *
     */
    const OTC4OPR_BUILTIN_RULESET_REPOSITORY = [
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
    //#endregion
    //////////////////////////////////////////////
    //////////////////////////////////////////////
    //#region UPDATE CSS
    function updateCss() {
        if (!OTC4OPR_UPDATE_CSS) {
            console.info(OTC4OPR, "Update print style SKIPPED")
            return
        }
        console.info(OTC4OPR, "Updating print style")
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
        document.head.appendChild(style);
    }

    //#endregion

    //#region DATA MODEL
    /**
     *
     */
    class ForceList {
        constructor(name, books, datacards) {
            this.name = name
            this.books = books.map(ArmyBook.parse)
            this.datacards = datacards
        }

        static parse(rootElement) {
            console.info(OTC4OPR, "Parsing force list header ...")
            let headerElement = uniqCN(rootElement, 'print-only')
            let nameElement = uniqTag(headerElement, 'h1')
            let nameSplit = elementText(nameElement).split(/\s•\s/)
            let nameString = nameSplit[0].trim()
            let booksElement = uniqTag(headerElement, 'h4')
            let booksString = elementText(booksElement).match(/,/) || [ elementText(booksElement)]
            console.info(OTC4OPR, "Parsing datacards ...")
            let datacardsContainerElement = uniqCN(rootElement, 'MuiContainer-root')
            let datacardRoots = datacardsContainerElement.querySelectorAll(".MuiPaper-root")
            let datacards = createList(datacardRoots, DataCard.create)
            let result = new ForceList(nameString, booksString, datacards)
            console.info(OTC4OPR, "Parsed force list", result)
            return result
        }
    }

    class ArmyBook {
        constructor(name, version) {
            this.name = name
            this.version = version
        }

        static parse(text) {
            if (!text) {
                return undefined
            }
            let textMatch = text.trim().match(/^(.*) ([\d\.]+)$/)
            if (!textMatch) {
                return new ArmyBook(cleanUpString(text), undefined)
            } else {
                return new ArmyBook(cleanUpMatch(textMatch, 1), cleanUpMatch(textMatch, 2))
            }
        }
    }

    class DataCard {
        constructor(root) {
            this.root = root
            this.datacard = this
            this.headerElement = root.children[0]?.querySelectorAll('p')?.item(0)
            this.name = elementText(this.headerElement).match(/(?:\d+x\s*)?(.+?)\s*\[\d+].*/)[1];
            let tail = root.children[1];

            let statsElementsContainer = uniqCN(tail, 'MuiStack-root')
            let statsElements = statsElementsContainer.querySelectorAll('.MuiBox-root')
            let datacard = this
            this.stats = createMap(statsElements, (root) => new Stat(root, datacard))

            let specialElementsContainer = statsElementsContainer.nextElementSibling
            if (!specialElementsContainer.classList.contains('MuiBox-root')) {
                throw new OTC4OPRError('Unable to retrieve special container', specialElementsContainer)
            }
            let specialElements = specialElementsContainer.querySelectorAll('p')
            this.specials = createMap(specialElements, (root) => new SpecialAbility(root, datacard))

            let tables = tail.querySelectorAll('table')
            let weaponElementsContainer = tables[0].querySelectorAll('tbody')[0]
            let weaponElements = weaponElementsContainer.querySelectorAll('tr')
            this.weapons = createMap(weaponElements, (root) => new Weapon(root, datacard))

            if (tables.length > 1) {
                let upgradeElementContainer = tables[1].querySelectorAll('tbody')[0]
                let upgradeElements = upgradeElementContainer.querySelectorAll('tr')
                this.upgrades = createMap(upgradeElements, (root) => new Upgrade(root, datacard))
            } else {
                this.upgrades = new Map()
            }
        }

        hasUpgrade(name) {
            return this.upgrades.has(cleanUpString(name))
        }

        hasWeapon(name) {
            return this.weapons.has(cleanUpString(name))
        }

        changeName(newValue) {
            this.headerElement.innerText = elementText(this.headerElement).replace(this.name, newValue);
        }

        static create(root) {
            let sub = root.querySelectorAll('.MuiPaper-root');
            if (sub.length !== 0) {
                return null;
            }
            return new DataCard(root);
        }
    }

    class Stat {
        constructor(root, datacard) {
            this.root = root
            this.datacard = datacard
            let els = root.querySelectorAll('span')
            if (els.length !== 2) {
                throw  new OTC4OPRError('Expecting two elements in Stat', els)
            }
            this.nameElement = els[0]
            this.name = elementText(this.nameElement)
            this.valueElement = els[1]
            this.value = elementText(this.valueElement)
        }
    }

    class SpecialAbility {
        constructor(root, datacard) {
            this.root = root
            this.datacard = datacard
            let els = root.querySelectorAll('span')
            if (els.length !== 2) {
                throw new OTC4OPRError('Expecting two elements in Special', els)
            }
            this.nameElement = els[0]
            this.name = elementText(this.nameElement).replace(/\s+-\s*$/, "")
            this.descriptionElement = els[1]
            this.description = elementText(this.descriptionElement)
        }

        changeName(newValue) {
            this.nameElement.innerText = newValue + " - " + this.description
        }
    }

    class Weapon {
        constructor(root, datacard) {
            this.root = root
            this.datacard = datacard
            this.nameElement = root.children[0]
            let match = elementText(this.nameElement).match(/^(\d+)x\s+(.*)$/);
            if (match) {
                this.count = parseInt(match[1], 10)
                this.name = match[2]
            } else {
                this.count = 1
                this.name = elementText(this.nameElement)
            }
            this.rngElement = root.children[1]
            this.rng = elementText(this.rngElement)
            this.atkElement = root.children[2]
            this.atk = elementText(this.atkElement)
            this.speElement = root.children[3]
            this.spe = elementText(this.speElement)
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
            this.name = elementText(this.nameElement)
            this.speElement = root.children[1]
            this.spe = elementText(this.speElement)
        }
    }

    //#endregion

    //#region RENAME
    function parseRulePredicate(predicate) {
        if (typeof predicate === 'function') {
            return predicate
        }
        if (typeof predicate !== 'string') {
            throw new OTC4OPRError("Unknown predicate", predicate)
        }
        predicate = cleanUpString(predicate)
        let predicateSplit = predicate.split(/\s*#\s*/)
        if (predicateSplit.length > 1) {
            let name = cleanUpString(predicateSplit[0])
            let upgrade = cleanUpString(predicateSplit[1])
            return function (target) {
                if (cleanUpString(target.name) !== name) {
                    return false
                }
                if (target.datacard.hasUpgrade(upgrade) || target.datacard.hasWeapon(upgrade)) {
                    return true
                }
                return false
            }
        } else {
            return function (target) {
                return cleanUpString(target.name) === predicate;
            }
        }
    }

    function parseRuleAction(action) {
        if (typeof action === 'function') {
            return action
        }
        if (typeof action !== 'string') {
            throw new OTC4OPRError("Unknown action", action)
        }
        return function (datacard, target) {
            return action;
        }
    }

    /**
     * Represents single rule used in renaming: IF predicate(target) THEN target.name := action(target)
     *
     **/
    class Rule {
        constructor(ruleData) {
            if (typeof ruleData === 'string') {
                let paSplit = ruleData.split(/\s=>\s/)
                this.predicate = parseRulePredicate(paSplit[0])
                this.action = parseRuleAction(paSplit[1])
            } else if (typeof ruleData === 'object') {
                this.predicate = parseRulePredicate(ruleData.predicate)
                this.action = parseRuleAction(ruleData.action)
            } else {
                throw new OTC4OPRError('Unrecognized predicate-action', ruleData)
            }
        }

        apply(target) {
            if (!this.predicate(target)) {
                return false
            }
            let newName = this.action(target)
            target.changeName(newName)
            return true
        }
    }


    class RulesetRepository {
        constructor(repositoryData) {
            this.rulesets = repositoryData.map((rulesetData) => new Ruleset(rulesetData))
        }

        static create(repositoryData) {
            if (typeof repositoryData === 'undefined') {
                if (typeof OTC4OPR_BUILTIN_RULESET_REPOSITORY === 'undefined') {
                    throw new OTC4OPRError(OTC4OPR, "Hardcoded repository variable not found. Check OTC4OPR_BUILTIN_RULESET_REPOSITORY constant in settings.")
                }
                return new RulesetRepository(OTC4OPR_BUILTIN_RULESET_REPOSITORY)
            }
            return new RulesetRepository(repositoryData)
        }

        selectRuleset(forceList) {
            for (let ruleset of this.rulesets) {
                if (ruleset.predicate(forceList)) {
                    return ruleset
                }
            }
            return undefined
        }
    }


    class Ruleset {

        constructor(rulesetData) {
            this.predicate = Ruleset.createPredicate(rulesetData)
            this.color = rulesetData.color || undefined
            this.datacardRenames = () => (rulesetData.datacardRenames || []).map(pa => new Rule(pa))
            this.weaponRenames = () => (rulesetData.weaponRenames || []).map(pa => new Rule(pa))
            this.specialAbilityRenames = () => (rulesetData.specialAbilityRenames || []).map(pa => new Rule(pa))
        }

        apply(datacard) {
            for (let change of this.datacardRenames()) {
                if (change.apply(datacard)) {
                    break;
                }
            }

            for (let weapon of datacard.weapons.values()) {
                for (let change of this.weaponRenames()) {
                    if (change.apply(weapon)) {
                        break;
                    }
                }
            }

            for (let special of datacard.specials.values()) {
                for (let change of this.specialAbilityRenames()) {
                    if (change.apply(special)) {
                        break;
                    }
                }
            }
        }

        undo(datacard) {

            datacard.changeName(datacard.name)

            for (let weapon of datacard.weapons.values()) {
                weapon.changeName(weapon.name)
            }

            for (let special of datacard.specials.values()) {
                special.changeName(special.name)
            }
        }

        static createPredicate(rulesetObject) {
            let predicate = rulesetObject.predicate
            let pattern = rulesetObject.pattern
            if (predicate && pattern) {
                throw new OTC4OPRError("Both pattern and predicate are defined. Pick one!", rulesetObject)
            }
            if (typeof predicate === 'function') {
                return predicate
            }
            if (typeof pattern === 'string') {
                let patternSplit = pattern.split('@')
                let forceNamePattern = makeGlobPattern(patternSplit[0].trim())
                let bookNamePattern = makeGlobPattern(patternSplit.length > 1 ? patternSplit[1].trim() : undefined)
                return (forceList) => {
                    if (!forceNamePattern && !bookNamePattern) {
                        return false
                    }
                    if (forceNamePattern && !forceNamePattern.test(forceList.forceName)) {
                        return false
                    }
                    if (!bookNamePattern) {
                        return true
                    }
                    for (let book of forceList.books) {
                        if (bookNamePattern.test(book.name)) {
                            return true
                        }
                        if (bookNamePattern.test(book.name + " " + book.version)) {
                        }
                    }
                    return false
                }
            }
            throw new OTC4OPRError("Ruleset must have predicate function, pattern string set.", rulesetObject)
        }
    }
    //#endregion

    //#region UI
    function showMessage(message, actions) {
        // Check if a container already exists; if not, create one at the top of the page.
        let container = document.querySelector('#message-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'message-container';
            container.className = 'no-print'
            container.style.width = '100%';
            container.style.backgroundColor = '#f0f0f0';
            container.style.color = '#000000'
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
                    (function (callback) {
                        actionLink.addEventListener('click', function (event) {
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
    //#endregion

    //#region UTILS
    class OTC4OPRError extends Error {
        constructor(...args) {
            super(args
                .map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
                .join(' '))
        }
    }

    function cleanUpString(s) {
        if (!s) {
            return undefined
        }
        return s.trim().replace(/\s+/g, ' ').toLowerCase();
    }

    function cleanUpMatch(m, idx) {
        if (m.length <= idx) {
            return undefined
        }
        return cleanUpString(m[idx])
    }

    function uniqCN(container, className) {
        let result = container.querySelectorAll("." + className)
        if (result.length !== 1) {
            throw new OTC4OPRError("Element with className " + className + " not found or not unique in container", container, result)
        }
        return result[0]
    }

    function uniqTag(container, tagName) {
        let result = container.querySelectorAll(tagName)
        if (result.length !== 1) {
            throw new OTC4OPRError("Element with tag name " + tagName + " not found or not unique in container", container, result)
        }
        return result[0]
    }

    function createList(elements, c) {
        return Array.from(elements).map(c).filter(o => o !== null);
    }

    function createMap(elements, c) {
        return new Map(createList(elements, c).map(e=>[cleanUpString(e.name), e]))
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

    function elementText(element) {
        // this roundabout way is necessary for jsdom.
        // element.innerText in chrome or firefox returns recursive elements
        if (element.innerText) {
            return element.innerText
        }
        if (element.innerHTML.trim() !== "") {
            let texts = [];
            element.childNodes.forEach(child => {
                if (child.nodeType === element.ownerDocument.defaultView.Node.TEXT_NODE) {
                    const txt = child.textContent.trim();
                    if (txt) texts.push(txt);
                } else if (child.nodeType === element.ownerDocument.defaultView.Node.ELEMENT_NODE) {
                    const childTxt = elementText(child);
                    if (childTxt) texts.push(childTxt);
                }
            });
            return texts.join(" ");
        }
    }

    //#endregion

    //#region MAIN
    function rename(forceList, ruleset) {
        for (let datacard of forceList.datacards) {
            ruleset.apply(datacard)
        }
    }

    function undo(forceList, ruleset) {
        for (let datacard of forceList.datacards) {
            ruleset.undo(datacard)
        }
    }



    function withRepository(rulesetRepository, forceList) {
        let ruleset = rulesetRepository.selectRuleset(forceList)
        if (ruleset) {
            rename(forceList, ruleset)
            showMessage(`One thin coat has been applied to this force list.`, {
                // DISABLED needs more work "Undo": () => undo(forceList, ruleset)
            })
        } else {
            showMessage(`Unable to find ruleset for <strong>${forceList.full_name}</strong>. Select ruleset repository file <input type="file" accept="text/javascript" id="otc4otp_file" /> `, {
                "RELOAD": function () {

                    let inputFile = document.querySelector('#otc4otp_file')
                    const reader = new FileReader();
                    reader.readAsText(inputFile.files[0])
                    reader.onload = (e) => {
                        // THIS IS VERY VERY VERY UNSAFE!
                        // ONLY USE REPOSITORY FILES YOU ABSOLUTELY TRUST!
                        let repositoryData = eval(e.target.result)
                        let repository = RulesetRepository.create(repositoryData)
                        withRepository(repository,forceList)
                    }
                }
            })
        }
    }

    function fourtify() {
        console.info(OTC4OPR, "Running NOW")
        updateCss()
        console.info(OTC4OPR, "Creating force list ...")
        let forceList = ForceList.parse(document.body)
        console.info(OTC4OPR, "Selecting ruleset")
        let rulesetRepository = RulesetRepository.create()
        withRepository(rulesetRepository, forceList)
    }

    // This enables testing using mocha
    const hasModuleExports = typeof module !== 'undefined' && typeof module.exports
    if (!inTamperMonkey && hasModuleExports) {
        console.info("Running tests")
        module.exports = {
            makeGlobPattern,
            ForceList,
            ArmyBook,
            Datasheet: DataCard,
            Stat,
            Weapon,
            Special: SpecialAbility,
            cleanUpString,
            cleanUpMatch
        }
        return
    }

    // If query param otc4opr_debug set to true => running in IDE, ignore grace period param
    const skipGracePeriodBeforeFourtify = new URLSearchParams(window.location.search).get('otc4opr_debug') === 'true'

    if (!skipGracePeriodBeforeFourtify && OTC4OPR_GRACE_PERIOD > 0) {
        console.info(OTC4OPR, "Will start in ", OTC4OPR_GRACE_PERIOD, "...");
        setTimeout(fourtify, OTC4OPR_GRACE_PERIOD);
    } else {
        fourtify()
    }
    //#endregion

})();