let consuming = false;

export function setDialogConsuming(v: boolean): void {
    consuming = v;
}

export function isDialogConsuming(): boolean {
    return consuming;
}
