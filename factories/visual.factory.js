function makeVisual(opts = {}) {
    return {
        circle: jest.fn(opts.circle || (() => {})),
        line: jest.fn(opts.line || (() => {})),
        text: jest.fn(opts.text || (() => {})),
    };
}
module.exports = { makeVisual };
