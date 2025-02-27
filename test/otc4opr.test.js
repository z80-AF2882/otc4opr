const { assert } = require('chai')
const { describe } = require('mocha')
const mochaIt = require('mocha').it
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { expect } = require('chai');
// Exports from otc4opr.js
const {
    makeGlobPattern, createRulesetPredicate, ForceList, ArmyBook
} = require('../src/otc4opr')

describe('makeGlobPatten()', () => {
    function it(pattern, expected) {
        mochaIt(pattern, () => assert.strictEqual(makeGlobPattern(pattern).toString(), expected.toString()) )
    }
    it('*', /^.*$/i)
    it('hello', /^hello$/i)
    it('he*o', /^he.*o$/i)
});

describe('ArmyBook.parse()', () => {
    function it(text, expectedName, expectedVersion) {
        mochaIt(`'${text}' => '${expectedName}' version '${expectedVersion}'`, () => {
                let ab = ArmyBook.parse(text)
                assert.strictEqual(ab.name, expectedName)
                assert.strictEqual(ab.version, expectedVersion)
            }
        )
    }
    it('Army book name 1.0.1', "army book name", "1.0.1");
    it('Army book name  2', "army book name", "2");
    it('  Army   book   name  ', "army book name", undefined);
    it (" Sample  3.1.4 ", "sample", "3.1.4")
})

describe('ForceList.parse() using single book', () => {
    function it(book, expectedName, expectedVersion) {
        mochaIt(`'${book}' vs '${expectedName}' v'${expectedVersion}'`, () =>
            assert.deepEqual(new ForceList("No Name", [ book ]).books, [{name:expectedName, version:expectedVersion} ]) )
    }

    it ("Sample 3.1.4", "sample", "3.1.4")
    it (" Sample  3.1.4 ", "sample", "3.1.4")
})

describe('ForceList.parse() using multiple books', () => {
    function it(booksArray, expectedBooks) {
        mochaIt(`${Object.values(booksArray)} vs ${Object.values(expectedBooks)}`, () =>
            assert.deepEqual(new ForceList("No Name", booksArray).books, expectedBooks) )
    }

    it (["SampleA 3.1.4 "," Sample B 2.0"], [new ArmyBook("samplea", "3.1.4"), new ArmyBook("sample b", "2.0")])
    it ([
        " Sample   A    3.1.4 ",
        " Sample B 2.0",
        "SampleC",
    ], [
        new ArmyBook("sample a", "3.1.4"),
        new ArmyBook("sample b", "2.0"),
        new ArmyBook("samplec", undefined)
    ])
})

describe('Parse demo.html into ForceList', () => {
    function loadDocument(fileName) {
        const htmlPath = path.resolve(__dirname, fileName);
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        dom = new JSDOM(htmlContent, { runScripts: "dangerously", resources: "usable" });
        return  dom.window.document;
    }

    let it = mochaIt
    let document = loadDocument('demo.html')
    it('Document loaded', ()=> expect(document).to.not.be.undefined )
    let fl = ForceList.parse(document)
    it('Force list parsed', ()=> expect(fl).to.not.be.undefined )
    it('Army name', () => expect(fl.books[0].name).to.equal('beastmen'))
    it('Army version', () => expect(fl.books[0].version).to.equal('3.4.1'))
    it('Six datacards', () => expect(fl.datacards).to.have.length(6))
})