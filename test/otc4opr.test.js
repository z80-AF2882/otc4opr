const { assert } = require('chai')
const { describe } = require('mocha')
const mochaIt = require('mocha').it

const { makeGlobPattern, createRulesetPredicate, ForceList, ArmyBook } = require('../src/otc4opr')

describe('makeGlobPatten()', () => {
    function it(pattern, expected) {
        mochaIt(pattern, () => assert.strictEqual(makeGlobPattern(pattern).toString(), expected.toString()) )
    }
    it('*', /^.*$/i)
    it('hello', /^hello$/i)
    it('he*o', /^he.*o$/i)
});

const BB_HEADER = {
    forceName: "My force",
    bookFullName: "Battle Brothers 3.1.4",
    bookName: "Battle Brothers",
}

const DAO_HEADER = {
    forceName: "My force",
    bookFullName: "DAO Union 3.1.5",
    bookName: "DAO Union",
}

describe('createRulesetPredicate() with pattern returns true', () => {
    function it(pattern, header, expected) {
        mochaIt(`'${pattern}' vs [${Object.values(header)}]`, () => assert.strictEqual(createRulesetPredicate({pattern: pattern})(header), expected) )
    }
    // it("Battle Brothers", BB_HEADER, false)
    it("@Battle Brothers", BB_HEADER, true)
    it("@ Battle Brothers", BB_HEADER, true)
    it("@ DAO Union", BB_HEADER, false)
    it("@ DAO Union", DAO_HEADER, true)
    it("@ DaO Union", DAO_HEADER, true)
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
    it('Army book name 1.0.1', "Army book name", "1.0.1");
    it('Army book name  2', "Army book name", "2");
    it('  Army   book   name  ', "Army book name", undefined);
    it (" Sample  3.1.4 ", "Sample", "3.1.4")

})

describe('ForceList.parse() check single book', () => {
    function it(book, expectedName, expectedVersion) {
        mochaIt(`'${book}' vs '${expectedName}' v'${expectedVersion}'`, () =>
            assert.deepEqual(new ForceList("No Name", [ book ]).books, [{name:expectedName, version:expectedVersion} ]) )
    }

    it ("Sample 3.1.4", "Sample", "3.1.4")
    it (" Sample  3.1.4 ", "Sample", "3.1.4")
})

describe('ForceList.parse() check multiple books', () => {
    function it(booksArray, expectedBooks) {
        mochaIt(`${Object.values(booksArray)} vs ${Object.values(expectedBooks)}`, () =>
            assert.deepEqual(new ForceList("No Name", booksArray).books, expectedBooks) )
    }

    it (["SampleA 3.1.4 "," Sample B 2.0"], [new ArmyBook("SampleA", "3.1.4"), new ArmyBook("Sample B", "2.0")])
    it ([
        " Sample   A    3.1.4 ",
        " Sample B 2.0",
        "SampleC",
    ], [
        new ArmyBook("Sample A", "3.1.4"),
        new ArmyBook("Sample B", "2.0"),
        new ArmyBook("SampleC", undefined)
    ])
})
