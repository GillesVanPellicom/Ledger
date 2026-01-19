import * as icons from 'lucide-react';

const keys = Object.keys(icons);
const upperKeys = keys.filter(key => /^[A-Z]/.test(key));

console.log("Total keys:", keys.length);
console.log("Upper keys:", upperKeys.length);
console.log("Sample keys:", upperKeys.slice(0, 10));

// Check for suspicious keys
const suspicious = upperKeys.filter(key => !key.endsWith('Icon') && key !== 'createLucideIcon');
// Most icons don't end with Icon in lucide-react (e.g. "Activity", "Airplay")
// But let's see if there are any that are clearly not icons.

console.log("Checking for non-icon looking exports...");
upperKeys.forEach(key => {
    const val = icons[key];
    if (typeof val !== 'function') {
        console.log(`Key ${key} is not a function:`, typeof val);
    } else {
        // It is a function. Does it have any properties?
        // console.log(`Key ${key} is a function`);
    }
});
