if (!Array.prototype.toReversed) {
    Array.prototype.toReversed = function () {
        return [...this].reverse();
    };
}
// Using the absolute path to make sure it works
require('/home/ioiotinez/dev/budgetApp/node_modules/expo/bin/cli');
