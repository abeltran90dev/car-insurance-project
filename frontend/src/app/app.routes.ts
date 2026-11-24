import { Routes } from '@angular/router';
import { countryMatchGuard } from './core/country-match-guard';
import { STEPS } from './shared/steps';

/** ADR-002 routes. Step components are placeholders until the features replace them. */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./shared/country-picker').then((m) => m.CountryPicker),
  },
  {
    path: ':country',
    canMatch: [countryMatchGuard],
    loadComponent: () => import('./shared/country-shell').then((m) => m.CountryShell),
    children: [
      ...STEPS.map((step) => ({
        path: step,
        data: { step },
        loadComponent: () => import('./shared/step-placeholder').then((m) => m.StepPlaceholder),
      })),
      { path: '', pathMatch: 'full', redirectTo: 'datos' },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./shared/not-found').then((m) => m.NotFound),
  },
];
