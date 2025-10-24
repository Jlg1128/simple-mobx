import globalState from "./globalstate";
import { Reaction } from "./reaction";

function autorun(view: (r: Reaction) => void) {
    const reaction = new Reaction(
        'autorun@' + globalState.getDevId(),
        function(this: Reaction) {
            this.track(() => view(reaction));
        }
    );
    reaction._onBecomeStale();
    return reaction.getDisposer();
}

export {
    autorun,
}