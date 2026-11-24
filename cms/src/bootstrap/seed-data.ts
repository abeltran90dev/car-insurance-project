// Fictitious seed data (Spanish UI copy).
// Idempotency keys: country.code, form-field key + country, plan name + country.

export interface CopyEntry {
  key: string;
  value: string;
}
export interface SeedRule {
  type: string;
  value?: string;
  message?: string;
}
export interface SeedField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  required: boolean;
  order: number;
  group: 'policyholder' | 'vehicle';
  helpText?: string;
  errorMessage?: string;
  placeholder?: string;
  maskInSummary?: boolean;
  options?: Array<{ value: string; label: string; order: number }>;
  validations?: SeedRule[];
  draftOnly?: boolean;
}
export interface SeedPlan {
  name: string;
  shortDescription: string;
  basePrice: number;
  order: number;
  recommended: boolean;
  active: boolean;
  draftOnly?: boolean;
  coverages: Array<{ title: string; description?: string }>;
  benefits: Array<{ title: string; description?: string }>;
}
export interface SeedCountry {
  code: string;
  name: string;
  numberLocale: string;
  currency: string;
  legalAge: number;
  termsTitle: string;
  termsBody: string;
  fields: SeedField[];
  plans: SeedPlan[];
}

export const COUNTRY_COPY: CopyEntry[] = [
  { key: 'form.title', value: 'Cotiza tu seguro de auto' },
  { key: 'form.intro', value: 'Completa tus datos y los de tu vehículo.' },
  { key: 'form.loading', value: 'Cargando formulario…' },
  { key: 'form.error', value: 'No pudimos cargar el formulario.' },
  { key: 'form.empty', value: 'Por ahora no podemos mostrar el formulario para tu país.' },
  { key: 'form.genericError', value: 'Revisa este campo.' },
  { key: 'common.continue', value: 'Continuar' },
  { key: 'common.back', value: 'Volver' },
  { key: 'common.retry', value: 'Reintentar' },
  { key: 'common.yes', value: 'Sí' },
  { key: 'common.no', value: 'No' },
  { key: 'plans.title', value: 'Elige tu plan' },
  { key: 'plans.priceLabel', value: 'Precio estimado' },
  { key: 'plans.priceNote', value: 'Calculado según la antigüedad de tu vehículo' },
  { key: 'plans.pricePeriod', value: '/año' },
  { key: 'plans.recommendedBadge', value: 'Recomendado' },
  { key: 'plans.coveragesHeading', value: 'Coberturas' },
  { key: 'plans.benefitsHeading', value: 'Beneficios' },
  { key: 'plans.empty', value: 'Por ahora no hay planes disponibles para tu país.' },
  { key: 'plans.loading', value: 'Cargando planes…' },
  { key: 'plans.error', value: 'No pudimos cargar los planes.' },
  { key: 'summary.title', value: 'Resumen de tu cotización' },
  { key: 'summary.loading', value: 'Cargando tu resumen…' },
  { key: 'summary.policyholderTitle', value: 'Datos del tomador' },
  { key: 'summary.vehicleTitle', value: 'Datos del vehículo' },
  { key: 'summary.planTitle', value: 'Plan elegido' },
  { key: 'summary.priceLabel', value: 'Precio estimado' },
  { key: 'summary.editData', value: 'Editar datos' },
  { key: 'summary.changePlan', value: 'Cambiar plan' },
  { key: 'summary.termsAccept', value: 'Acepto los términos y condiciones' },
  { key: 'summary.termsUnavailable', value: 'Los términos y condiciones no están disponibles.' },
  { key: 'summary.planUnavailable', value: 'El plan elegido ya no está disponible.' },
  { key: 'summary.error', value: 'No pudimos cargar la información.' },
  { key: 'payment.pay', value: 'Pagar' },
  { key: 'payment.gatewayTitle', value: 'Pasarela de pago simulada' },
  { key: 'payment.simulateApprove', value: 'Simular pago aprobado' },
  { key: 'payment.simulateReject', value: 'Simular pago rechazado' },
  { key: 'payment.cancel', value: 'Cancelar' },
  { key: 'payment.processing', value: 'Procesando pago…' },
  {
    key: 'payment.rejected',
    value: 'El pago fue rechazado. No se realizó ningún cobro. Puedes intentarlo de nuevo.',
  },
  { key: 'confirmation.title', value: '¡Pago exitoso!' },
  { key: 'confirmation.quoteNumberLabel', value: 'Número de cotización' },
  { key: 'confirmation.newQuote', value: 'Nueva cotización' },
];

export const SITE_COPY: CopyEntry[] = [
  { key: 'picker.title', value: 'Elige tu país' },
  { key: 'picker.intro', value: 'Selecciona el país donde quieres cotizar.' },
  { key: 'picker.loading', value: 'Cargando países…' },
  { key: 'picker.error', value: 'No pudimos cargar los países.' },
  { key: 'notFound.title', value: 'País no encontrado' },
  { key: 'notFound.message', value: 'No ofrecemos cotizaciones para este país.' },
  { key: 'notFound.backToPicker', value: 'Volver a elegir país' },
  { key: 'common.retry', value: 'Reintentar' },
];

const nameRules = (): SeedRule[] => [
  { type: 'minLength', value: '2', message: 'Ingresa al menos 2 caracteres.' },
  { type: 'maxLength', value: '60', message: 'Máximo 60 caracteres.' },
];
const emailRule = (): SeedRule[] => [
  { type: 'pattern', value: '[^\\s@]+@[^\\s@]+\\.[^\\s@]+', message: 'Ingresa un correo válido.' },
];
const birthRules = (): SeedRule[] => [
  { type: 'required', message: 'Ingresa tu fecha de nacimiento.' },
  { type: 'minAge', message: 'Debes ser mayor de edad para cotizar.' },
];
const yearRules = (): SeedRule[] => [
  { type: 'vehicleYear', message: 'Ingresa un año de vehículo válido.' },
];
const mileageRules = (): SeedRule[] => [
  { type: 'min', value: '0', message: 'El kilometraje no puede ser negativo.' },
  { type: 'max', value: '500000', message: 'El kilometraje máximo es 500000.' },
];
const brands = [
  { value: 'toyota', label: 'Toyota', order: 1 },
  { value: 'chevrolet', label: 'Chevrolet', order: 2 },
  { value: 'mazda', label: 'Mazda', order: 3 },
  { value: 'kia', label: 'Kia', order: 4 },
];

const CO_FIELDS: SeedField[] = [
  {
    key: 'documentType', label: 'Tipo de documento', type: 'select', required: true, order: 1, group: 'policyholder',
    options: [
      { value: 'CC', label: 'Cédula de ciudadanía', order: 1 },
      { value: 'CE', label: 'Cédula de extranjería', order: 2 },
    ],
    validations: [{ type: 'required', message: 'Selecciona un tipo de documento.' }],
  },
  {
    key: 'documentNumber', label: 'Número de documento', type: 'text', required: true, order: 2, group: 'policyholder',
    helpText: 'Solo números, entre 6 y 10 dígitos.', placeholder: '1111111111', maskInSummary: true,
    validations: [{ type: 'colombianId', message: 'Ingresa un número de documento válido.' }],
  },
  { key: 'firstName', label: 'Nombres', type: 'text', required: true, order: 3, group: 'policyholder', validations: nameRules() },
  { key: 'lastName', label: 'Apellidos', type: 'text', required: true, order: 4, group: 'policyholder', validations: nameRules() },
  { key: 'birthDate', label: 'Fecha de nacimiento', type: 'date', required: true, order: 5, group: 'policyholder', validations: birthRules() },
  {
    key: 'email', label: 'Correo electrónico', type: 'text', required: true, order: 6, group: 'policyholder',
    placeholder: 'nombre@ejemplo.test', validations: emailRule(),
  },
  {
    key: 'phone', label: 'Celular', type: 'text', required: true, order: 7, group: 'policyholder', placeholder: '3001234567',
    validations: [{ type: 'pattern', value: '3\\d{9}', message: 'Ingresa un celular de 10 dígitos que empiece por 3.' }],
  },
  {
    key: 'city', label: 'Ciudad', type: 'select', required: true, order: 8, group: 'policyholder',
    options: [
      { value: 'bogota', label: 'Bogotá', order: 1 },
      { value: 'medellin', label: 'Medellín', order: 2 },
      { value: 'cali', label: 'Cali', order: 3 },
    ],
  },
  {
    key: 'acceptDataPolicy', label: 'Acepto el tratamiento de mis datos personales', type: 'checkbox', required: true,
    order: 9, group: 'policyholder',
    validations: [{ type: 'required', message: 'Debes aceptar el tratamiento de datos.' }],
  },
  {
    key: 'plate', label: 'Placa', type: 'text', required: true, order: 10, group: 'vehicle', placeholder: 'ABC123',
    validations: [{ type: 'pattern', value: '[A-Za-z]{3}\\d{3}', message: 'Ingresa una placa válida (ej. ABC123).' }],
  },
  { key: 'brand', label: 'Marca', type: 'select', required: true, order: 11, group: 'vehicle', options: brands },
  { key: 'model', label: 'Modelo', type: 'text', required: true, order: 12, group: 'vehicle', validations: [{ type: 'maxLength', value: '40' }] },
  { key: 'year', label: 'Año del vehículo', type: 'number', required: true, order: 13, group: 'vehicle', validations: yearRules() },
  { key: 'mileage', label: 'Kilometraje', type: 'number', required: false, order: 14, group: 'vehicle', validations: mileageRules() },
  { key: 'draftOnlyField', label: 'Campo en borrador', type: 'text', required: false, order: 99, group: 'vehicle', draftOnly: true },
];

const CL_FIELDS: SeedField[] = [
  { key: 'firstName', label: 'Nombres', type: 'text', required: true, order: 1, group: 'policyholder', validations: nameRules() },
  { key: 'lastName', label: 'Apellidos', type: 'text', required: true, order: 2, group: 'policyholder', validations: nameRules() },
  {
    key: 'documentNumber', label: 'RUT', type: 'text', required: true, order: 3, group: 'policyholder',
    helpText: 'Ingresa tu RUT con dígito verificador.', placeholder: '11.111.111-1', maskInSummary: true,
    errorMessage: 'Ingresa un RUT válido.', validations: [{ type: 'rut' }],
  },
  { key: 'birthDate', label: 'Fecha de nacimiento', type: 'date', required: true, order: 4, group: 'policyholder', validations: birthRules() },
  {
    key: 'phone', label: 'Celular', type: 'text', required: true, order: 5, group: 'policyholder', placeholder: '912345678',
    validations: [{ type: 'pattern', value: '9\\d{8}', message: 'Ingresa un celular de 9 dígitos que empiece por 9.' }],
  },
  {
    key: 'email', label: 'Correo electrónico', type: 'text', required: true, order: 6, group: 'policyholder',
    placeholder: 'nombre@ejemplo.test', validations: emailRule(),
  },
  {
    key: 'city', label: 'Comuna', type: 'select', required: true, order: 7, group: 'policyholder',
    options: [
      { value: 'santiago', label: 'Santiago', order: 1 },
      { value: 'providencia', label: 'Providencia', order: 2 },
      { value: 'valparaiso', label: 'Valparaíso', order: 3 },
    ],
  },
  {
    key: 'plate', label: 'Patente', type: 'text', required: true, order: 8, group: 'vehicle', placeholder: 'BBCC12',
    validations: [{ type: 'pattern', value: '[A-Za-z]{4}\\d{2}', message: 'Ingresa una patente válida (ej. BBCC12).' }],
  },
  { key: 'year', label: 'Año del vehículo', type: 'number', required: true, order: 9, group: 'vehicle', validations: yearRules() },
  { key: 'brand', label: 'Marca', type: 'select', required: true, order: 10, group: 'vehicle', options: brands },
  { key: 'model', label: 'Modelo', type: 'text', required: true, order: 11, group: 'vehicle', validations: [{ type: 'maxLength', value: '40' }] },
  { key: 'mileage', label: 'Kilometraje', type: 'number', required: false, order: 12, group: 'vehicle', validations: mileageRules() },
  { key: 'draftOnlyField', label: 'Campo en borrador', type: 'text', required: false, order: 99, group: 'vehicle', draftOnly: true },
];

interface PlanSet {
  names: [string, string, string];
  prices: [number, number, number];
  coverages: [string, string, string];
  benefits: [string, string];
}

// Plan seed per SPEC-US-02 section 3. Legacy plan is published but inactive; draft plan is never published.
const buildPlans = (s: PlanSet): SeedPlan[] => {
  const cov = (n: number) => s.coverages.slice(0, n).map((title) => ({ title }));
  const ben = (n: number) => s.benefits.slice(0, n).map((title) => ({ title }));
  return [
    {
      name: s.names[0], shortDescription: 'Protección esencial para tu vehículo.', basePrice: s.prices[0], order: 1,
      recommended: false, active: true, coverages: cov(1), benefits: ben(1),
    },
    {
      name: s.names[1], shortDescription: 'Cobertura completa para tu día a día.', basePrice: s.prices[1], order: 2,
      recommended: true, active: true, coverages: cov(2), benefits: ben(2),
    },
    {
      name: s.names[2], shortDescription: 'La máxima protección sin preocupaciones.', basePrice: s.prices[2], order: 3,
      recommended: false, active: true, coverages: cov(3), benefits: ben(2),
    },
    {
      name: 'Plan Antiguo', shortDescription: 'Plan descontinuado (inactivo).', basePrice: s.prices[0], order: 4,
      recommended: false, active: false, coverages: cov(1), benefits: [],
    },
    {
      name: 'Plan Borrador', shortDescription: 'Plan en preparación (sin publicar).', basePrice: s.prices[2], order: 5,
      recommended: false, active: true, draftOnly: true, coverages: cov(1), benefits: [],
    },
  ];
};

const TERMS_CO =
  '1. Este es un texto de ejemplo para Colombia.\n2. Supervisión: Superintendencia Financiera de Colombia (texto de ejemplo).\n3. La cotización es simulada y no constituye una póliza.\n4. No se realiza ningún cobro real.';

const TERMS_CL =
  '1. Este es un texto de ejemplo para Chile.\n2. Supervisión: Comisión para el Mercado Financiero (texto de ejemplo).\n3. La cotización es simulada y no constituye una póliza.\n4. No se realiza ningún cobro real.';

export const COUNTRIES: SeedCountry[] = [
  {
    code: 'CO', name: 'Colombia', numberLocale: 'es-CO', currency: 'COP', legalAge: 18,
    termsTitle: 'Términos y condiciones – Colombia', termsBody: TERMS_CO,
    fields: CO_FIELDS,
    plans: buildPlans({ names: ['Plan Básico', 'Plan Estándar', 'Plan Premium'], prices: [850000, 1250000, 1900000], coverages: ['Responsabilidad civil', 'Pérdida total por daños', 'Hurto'], benefits: ['Grúa 24/7', 'Vehículo de reemplazo'] }),
  },
  {
    code: 'CL', name: 'Chile', numberLocale: 'es-CL', currency: 'CLP', legalAge: 18,
    termsTitle: 'Términos y condiciones – Chile', termsBody: TERMS_CL,
    fields: CL_FIELDS,
    plans: buildPlans({ names: ['Plan Esencial', 'Plan Full', 'Plan Full Plus'], prices: [259990, 389990, 549990], coverages: ['Responsabilidad civil', 'Daños propios', 'Robo'], benefits: ['Asistencia en ruta', 'Auto de reemplazo'] }),
  },
];
