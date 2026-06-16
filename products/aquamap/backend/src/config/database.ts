import knexLib from 'knex';
import knexConfig from '../../knexfile.js';

const environment = process.env.NODE_ENV || 'development';
export const knex = knexLib(knexConfig[environment]);
