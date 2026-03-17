/**
 * @fileoverview Tabla de sobrecargas de uso (cargas vivas) según CIRSOC 101,
 * equivalente a la Tabla 4.3-1 de ASCE 7.
 *
 * L  = sobrecarga de uso uniforme (kN/m²), valor ya reducible o nominal.
 * L0 = sobrecarga de uso nominal sin reducir (kN/m²).
 */

/**
 * @typedef {Object} SobrecargaUso
 * @property {string} id   - Identificador único de la ocupación
 * @property {string} uso  - Descripción del tipo de uso / ocupación
 * @property {number} L    - Sobrecarga uniforme de diseño (kN/m²)
 * @property {number} L0   - Sobrecarga nominal sin reducir (kN/m²)
 */

/**
 * Tabla de sobrecargas de uso según CIRSOC 101.
 * Los valores de L y L0 coinciden cuando la norma no distingue
 * entre valor reducible y nominal para esa categoría.
 *
 * @type {SobrecargaUso[]}
 */
export const SOBRECARGAS_USO = [
  {
    id: 'residencial',
    uso: 'Residencial (viviendas, departamentos)',
    L: 2.0,
    L0: 2.0,
  },
  {
    id: 'oficinas',
    uso: 'Oficinas',
    L: 2.5,
    L0: 2.5,
  },
  {
    id: 'aulas',
    uso: 'Aulas y escuelas',
    L: 3.0,
    L0: 3.0,
  },
  {
    id: 'corredores',
    uso: 'Corredores de plantas superiores',
    L: 4.0,
    L0: 4.0,
  },
  {
    id: 'salon_fija',
    uso: 'Salones de reunión (asientos fijos)',
    L: 2.5,
    L0: 2.5,
  },
  {
    id: 'salon_movil',
    uso: 'Salones de reunión (asientos móviles)',
    L: 5.0,
    L0: 5.0,
  },
  {
    id: 'comercio_pb',
    uso: 'Comercio – planta baja',
    L: 5.0,
    L0: 5.0,
  },
  {
    id: 'comercio_pisos',
    uso: 'Comercio – pisos superiores',
    L: 4.0,
    L0: 4.0,
  },
  {
    id: 'estacionamiento',
    uso: 'Estacionamiento (vehículos livianos)',
    L: 2.5,
    L0: 2.5,
  },
  {
    id: 'hospitales',
    uso: 'Hospitales (salas y habitaciones)',
    L: 3.0,
    L0: 3.0,
  },
  {
    id: 'biblioteca_lectura',
    uso: 'Bibliotecas – salas de lectura',
    L: 3.0,
    L0: 3.0,
  },
  {
    id: 'biblioteca_deposito',
    uso: 'Bibliotecas – depósito de libros',
    L: 7.5,
    L0: 7.5,
  },
  {
    id: 'industria_liviana',
    uso: 'Industria liviana',
    L: 6.0,
    L0: 6.0,
  },
  {
    id: 'industria_pesada',
    uso: 'Industria pesada',
    L: 12.0,
    L0: 12.0,
  },
  {
    id: 'terraza_accesible',
    uso: 'Terrazas accesibles',
    L: 3.0,
    L0: 3.0,
  },
  {
    id: 'balcones',
    uso: 'Balcones',
    L: 5.0,
    L0: 5.0,
  },
];
