/**
 * correas.js — Perfiles de correas C conformadas en frío
 * Propiedades: h (mm), b (mm), a (labio mm), t (espesor mm),
 *              Ix (cm4), Sx (cm3), Iy (cm4), Fy (MPa), peso (kN/m)
 */
export const CORREAS_TIPO = [
  { id: 'C100x50x15x1.6', nombre: 'C 100×50×15×1.6', peso: 0.025, h: 100, b: 50, a: 15, t: 1.6,  Ix:   42, Sx:  8.4, Iy:  6.8, Fy: 250 },
  { id: 'C100x50x15x2.0', nombre: 'C 100×50×15×2.0', peso: 0.031, h: 100, b: 50, a: 15, t: 2.0,  Ix:   52, Sx: 10.4, Iy:  8.4, Fy: 250 },
  { id: 'C120x50x15x2.0', nombre: 'C 120×50×15×2.0', peso: 0.036, h: 120, b: 50, a: 15, t: 2.0,  Ix:   86, Sx: 14.3, Iy:  8.6, Fy: 250 },
  { id: 'C160x60x20x2.0', nombre: 'C 160×60×20×2.0', peso: 0.047, h: 160, b: 60, a: 20, t: 2.0,  Ix:  196, Sx: 24.5, Iy: 15.2, Fy: 250 },
  { id: 'C160x60x20x2.5', nombre: 'C 160×60×20×2.5', peso: 0.058, h: 160, b: 60, a: 20, t: 2.5,  Ix:  241, Sx: 30.1, Iy: 18.7, Fy: 250 },
  { id: 'C200x60x20x2.0', nombre: 'C 200×60×20×2.0', peso: 0.053, h: 200, b: 60, a: 20, t: 2.0,  Ix:  371, Sx: 37.1, Iy: 15.6, Fy: 250 },
  { id: 'C200x60x20x2.5', nombre: 'C 200×60×20×2.5', peso: 0.063, h: 200, b: 60, a: 20, t: 2.5,  Ix:  458, Sx: 45.8, Iy: 19.2, Fy: 250 },
  { id: 'C200x80x20x2.5', nombre: 'C 200×80×20×2.5', peso: 0.071, h: 200, b: 80, a: 20, t: 2.5,  Ix:  510, Sx: 51.0, Iy: 38.4, Fy: 250 },
  { id: 'C250x80x25x2.5', nombre: 'C 250×80×25×2.5', peso: 0.086, h: 250, b: 80, a: 25, t: 2.5,  Ix:  888, Sx: 71.0, Iy: 40.2, Fy: 250 },
  { id: 'C250x80x25x3.2', nombre: 'C 250×80×25×3.2', peso: 0.103, h: 250, b: 80, a: 25, t: 3.2,  Ix: 1120, Sx: 89.6, Iy: 50.6, Fy: 250 },
  { id: 'C300x80x25x3.2', nombre: 'C 300×80×25×3.2', peso: 0.118, h: 300, b: 80, a: 25, t: 3.2,  Ix: 1840, Sx: 122.7, Iy: 51.8, Fy: 250 },
  { id: 'custom',          nombre: 'Personalizado',    peso: 0 },
];
