export const getSize = (v: number | string) => typeof v === 'number' || /^\d+$/.test(v) ? `${v}px` : `${v}`
