const { assert } = require('chai')
const { describe } = require('mocha')
const mochaIt = require('mocha').it

const { makeGlobPattern, createRulesetPredicate } = require('../src/otc4opr')

describe('makeGlobPatten()', () => {
    function it(pattern, expected) {
        mochaIt(pattern, () => assert.strictEqual(makeGlobPattern(pattern).toString(), expected.toString()) )
    }
    it('*', /^.*$/i)
    it('hello', /^hello$/i)
    it('he*o', /^he.*o$/i)
});

function header(forceName, bookFullName, bookName) {
    return {
        forceName: forceName,
        bookFullName: bookFullName,
        bookName: bookName,
    }
}

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