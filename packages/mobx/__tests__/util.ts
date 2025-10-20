import { observable } from "../src";

export function $g(): { foo?: { bar?: any; }; [key: string]: any } {
    return observable(
        {
            foo: {
                bar: 1
            }
        }
    )
}
