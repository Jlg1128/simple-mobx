import { observable } from "../src";

export function $g(): { foo?: { bar?: any } } {
    return observable(
        {
            foo: {
                bar: 1
            }
        }
    )
}
