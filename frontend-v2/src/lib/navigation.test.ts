import {describe,expect,it} from 'vitest';
import {routeFromHash} from './navigation';

describe('routeFromHash',()=>{
  it.each([
    ['#/','overview'],['#/tickets','tickets'],['#/templates','templates'],
    ['#/system','system'],['#/log','log'],['#/settings','settings']
  ])('maps %s to %s',(hash,expected)=>expect(routeFromHash(hash)).toBe(expected));
  it('falls back to overview',()=>expect(routeFromHash('#/unknown')).toBe('overview'));
});
