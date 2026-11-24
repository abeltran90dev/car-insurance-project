import { Routes } from '@angular/router';
import { countryMatchGuard } from './core/country-match-guard';
import { plansGuard } from './features/plan-list/plans-guard';
import { confirmationGuard } from './features/confirmation/confirmation-guard';
import { summaryGuard } from './features/summary/summary-guard';

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
      {
        path: 'datos',
        loadComponent: () =>
          import('./features/applicant-form/applicant-form').then((m) => m.ApplicantForm),
      },
      {
        path: 'planes',
        canActivate: [plansGuard],
        runGuardsAndResolvers: 'always',
        loadComponent: () => import('./features/plan-list/plan-list').then((m) => m.PlanList),
      },
      {
        path: 'resumen',
        canActivate: [summaryGuard],
        runGuardsAndResolvers: 'always',
        loadComponent: () => import('./features/summary/summary').then((m) => m.Summary),
      },
      {
        path: 'confirmacion',
        canActivate: [confirmationGuard],
        loadComponent: () =>
          import('./features/confirmation/confirmation').then((m) => m.Confirmation),
      },
      { path: '', pathMatch: 'full', redirectTo: 'datos' },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./shared/not-found').then((m) => m.NotFound),
  },
];
