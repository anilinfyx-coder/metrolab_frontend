import * as yup from 'yup';

export const emailSchema = yup
  .string()
  .trim()
  .required('Email address is required.')
  .email('Please enter a valid email address.');

export const mobileSchema = yup
  .string()
  .trim()
  .required('Mobile number is required.')
  .matches(/^[0-9]{9,10}$/, 'Mobile number must be 9 to 10 digits.');

export const optionalMobileSchema = yup
  .string()
  .trim()
  .test('mobile-format', 'Mobile number must be 9 to 10 digits.', value => {
    if (!value) return true;
    return /^[0-9]{9,10}$/.test(value);
  });

export const optionalEmailSchema = yup
  .string()
  .trim()
  .test('email-format', 'Please enter a valid email address.', value => {
    if (!value) return true;
    return yup.string().email().isValidSync(value);
  });

export const loginSchema = yup.object({
  username: yup.string().trim().required('Email address is required.'),
  password: yup.string().required('Password is required.'),
});

export type LoginFormValues = yup.InferType<typeof loginSchema>;

export const forgotPasswordSchema = yup.object({
  email: emailSchema,
});

export type ForgotPasswordFormValues = yup.InferType<typeof forgotPasswordSchema>;

/** Matches existing app password rule: min 6, only @# as special characters. */
export const appPasswordSchema = yup
  .string()
  .required('Password is required.')
  .min(6, 'Password must be at least 6 characters.')
  .test(
    'allowed-special',
    'Password can only contain letters, numbers, and @# special characters.',
    value => !value || !/[^a-zA-Z0-9@#]/.test(value),
  );

export const optionalAppPasswordSchema = yup
  .string()
  .test('password-length', 'Password must be at least 6 characters.', value => !value || value.length >= 6)
  .test(
    'allowed-special',
    'Password can only contain letters, numbers, and @# special characters.',
    value => !value || !/[^a-zA-Z0-9@#]/.test(value),
  );

export const resetPasswordSchema = yup.object({
  password: appPasswordSchema,
  confirmPassword: yup
    .string()
    .required('Please confirm your password.')
    .oneOf([yup.ref('password')], 'Passwords do not match.'),
});

export type ResetPasswordFormValues = yup.InferType<typeof resetPasswordSchema>;

/** Super admin staff keeps the legacy rule: min 6 when a new password is entered. */
export const optionalLegacyPasswordSchema = yup
  .string()
  .test('password-length', 'Password must be at least 6 characters.', value => !value || value.length >= 6);

export const PASSWORD_HELPER_TEXT =
  'Password must be at least 6 characters. Only @ and # are allowed as special characters.';

const requiredTrimmed = (label: string) =>
  yup.string().trim().required(`Please enter ${label}.`);

export function profileSchemaForPortal(isOrg: boolean) {
  return yup.object({
    id: yup.number().required(),
    name: isOrg ? yup.string().trim() : requiredTrimmed('your name'),
    email: emailSchema,
    mobile: optionalMobileSchema,
    password: optionalAppPasswordSchema,
    contact_person_name: yup.string().trim(),
    company_name: isOrg ? requiredTrimmed('the company / lab name') : yup.string().trim(),
  });
}

export type ProfilePortalFormValues = yup.InferType<ReturnType<typeof profileSchemaForPortal>>;

export const corporateRegistrationSchema = yup.object({
  company_name: requiredTrimmed('the company name'),
  contact_person_name: requiredTrimmed('the contact person name'),
  mobile: mobileSchema,
  email: emailSchema,
  address: requiredTrimmed('the address'),
  country: requiredTrimmed('the country'),
  state: requiredTrimmed('the state'),
  city: requiredTrimmed('the city'),
  pincode: requiredTrimmed('the pincode'),
  otp: yup.string().trim().required('Please enter the OTP.'),
});

export type CorporateRegistrationFormValues = yup.InferType<typeof corporateRegistrationSchema>;

export const otpRequestSchema = yup.object({
  email: emailSchema,
  mobile: mobileSchema,
});

export const changePasswordFormSchema = yup.object({
  oldPassword: yup.string().required('Old password is required.'),
  newPassword: appPasswordSchema,
  confirmPassword: yup
    .string()
    .required('Please confirm your new password.')
    .oneOf([yup.ref('newPassword')], 'Passwords do not match.'),
});

export type ChangePasswordFormValues = yup.InferType<typeof changePasswordFormSchema>;

function staffUserSchemaBase(isEditing: boolean, roleIds: string[], roleMessage: string) {
  return yup.object({
    name: requiredTrimmed('the name'),
    email: emailSchema,
    mobile: mobileSchema,
    role_id: yup
      .string()
      .required('Please select a role.')
      .oneOf(roleIds, roleMessage),
    password: isEditing ? optionalAppPasswordSchema : appPasswordSchema,
    id: yup.number().nullable(),
  });
}

export function b2bStaffUserSchema(isEditing: boolean) {
  return staffUserSchemaBase(isEditing, ['6', '7'], 'Please select a role.');
}

export type B2bStaffUserFormValues = yup.InferType<ReturnType<typeof b2bStaffUserSchema>>;

export function superAdminStaffSchema(isEditing: boolean) {
  return yup.object({
    name: requiredTrimmed('the staff name'),
    email: emailSchema,
    mobile: mobileSchema,
    role_id: yup
      .string()
      .required('Please select a role.')
      .oneOf(['2', '3'], 'Please select a role.'),
    password: isEditing
      ? yup
          .string()
          .default('')
          .test('password-length', 'Password must be at least 6 characters.', value => !value || value.length >= 6)
      : yup.string().required('Please enter a password.').min(6, 'Password must be at least 6 characters.'),
    id: yup.number().nullable().default(null),
  });
}

export type SuperAdminStaffFormValues = {
  name: string;
  email: string;
  mobile: string;
  role_id: string;
  password: string;
  id: number | null;
};

export const b2bPatientSchema = yup.object({
  name: requiredTrimmed('the patient name'),
  mobile: mobileSchema,
  email: optionalEmailSchema,
  dob: yup.string().trim(),
  gender: yup.number().required('Please select gender.'),
  city: yup.string().trim(),
  state: yup.string().trim(),
  zipcode: yup.string().trim(),
  uid: yup.string().trim(),
});

export type B2bPatientFormValues = yup.InferType<typeof b2bPatientSchema>;

export const patientDemographicSchema = yup.object({
  name: requiredTrimmed('the patient name'),
  mobile: mobileSchema,
  gender: yup.string().required('Please select gender.'),
  dob_month: yup.string().required('Please enter date of birth.'),
  dob_day: yup.string().required('Please enter date of birth.'),
  dob_year: yup
    .string()
    .trim()
    .required('Please enter date of birth.')
    .matches(/^\d{4}$/, 'Please enter a valid year.'),
  driving_license_state: requiredTrimmed('the driving license state'),
  driving_license: requiredTrimmed('the driving license number'),
  street1: requiredTrimmed('street address'),
  street2: yup.string().trim(),
  city: requiredTrimmed('the city'),
  state: requiredTrimmed('the state'),
  zipcode: requiredTrimmed('the zip code'),
  email: emailSchema,
  ssn: yup.string().trim(),
  accept: yup
    .boolean()
    .oneOf([true], 'You must acknowledge that the information provided is accurate.'),
});

export type PatientDemographicFormValues = {
  name: string;
  mobile: string;
  gender: string;
  dob_month: string;
  dob_day: string;
  dob_year: string;
  driving_license_state: string;
  driving_license: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  zipcode: string;
  email: string;
  ssn: string;
  accept: boolean;
};

export const namedEntityWithIdSchema = yup.object({
  name: requiredTrimmed('the name'),
  description: requiredTrimmed('the description'),
  id: yup.number().nullable(),
});

export type NamedEntityWithIdFormValues = yup.InferType<typeof namedEntityWithIdSchema>;

export const documentTypeSchema = yup.object({
  name: requiredTrimmed('the name'),
  description: requiredTrimmed('the description'),
});

export type DocumentTypeFormValues = yup.InferType<typeof documentTypeSchema>;

export const corporateEmployeeSchema = yup.object({
  first_name: requiredTrimmed('first name'),
  last_name: requiredTrimmed('last name'),
  mobile: mobileSchema,
  gender: yup.string(),
  dob_month: yup.string(),
  dob_day: yup.string(),
  dob_year: yup.string(),
  driving_license_state: yup.string(),
  driving_license: yup.string(),
  street1: yup.string(),
  street2: yup.string(),
  city: yup.string(),
  state: yup.string(),
  zipcode: yup.string(),
  email: optionalEmailSchema,
  ssn: yup.string(),
  department: yup.string(),
});

export type CorporateEmployeeFormValues = yup.InferType<typeof corporateEmployeeSchema>;

export const testReportQuestionSchema = yup.object({
  question_text: requiredTrimmed('the question text'),
  type_data_id: yup.string(),
});

export type TestReportQuestionFormValues = yup.InferType<typeof testReportQuestionSchema>;

export const testResultParameterSchema = yup.object({
  name: requiredTrimmed('the name'),
  placeholder: yup.string(),
  label: yup.string(),
  input_type: yup.string().required('Please select an input type.'),
  validate_regex: yup.string(),
  unit_text: yup.string(),
  description: yup.string(),
  is_mandatory: yup.boolean(),
  type_data_id: yup.string(),
});

export type TestResultParameterFormValues = yup.InferType<typeof testResultParameterSchema>;

export const labTestFormSchema = yup.object({
  name: requiredTrimmed('the test name'),
  description: yup.string(),
  showCollectedDate: yup.boolean().nullable(),
  showReportStatus: yup.boolean().nullable(),
  showSpecimen: yup.boolean().nullable(),
  showFinalResult: yup.boolean().nullable(),
});

export type LabTestFormValues = yup.InferType<typeof labTestFormSchema>;

export const labTestCategoryNameSchema = yup.object({
  name: requiredTrimmed('the name'),
});

export function corporateClientFormSchema(isEditing: boolean) {
  return yup.object({
    company_name: requiredTrimmed('the company name'),
    contact_person_name: requiredTrimmed('the contact person name'),
    mobile: mobileSchema,
    email: emailSchema,
    address: requiredTrimmed('the address'),
    country_id: yup.string().required('Please select a country.'),
    state_id: yup.string().required('Please select a state.'),
    city_id: yup.string().required('Please select a city.'),
    pincode: yup.string().trim(),
    password: isEditing ? optionalAppPasswordSchema : appPasswordSchema,
    id: yup.number().nullable(),
  });
}

export type CorporateClientFormValues = {
  company_name: string;
  contact_person_name: string;
  mobile: string;
  email: string;
  address: string;
  country_id: string;
  state_id: string;
  city_id: string;
  pincode: string;
  password: string;
  id: number | null;
};

export function b2bClientFormSchema(isEditing = false) {
  return yup.object({
    company_name: requiredTrimmed('the B2B company name'),
    contact_person_name: requiredTrimmed('the contact person name'),
    mobile: mobileSchema,
    email: emailSchema,
    password: isEditing
      ? yup.string().trim().required('Password is required.')
      : appPasswordSchema,
    address: requiredTrimmed('the address'),
    country_id: yup.string().required('Please select a country.'),
    state_id: yup.string().required('Please select a state.'),
    city_id: yup.string().required('Please select a city.'),
    pincode: requiredTrimmed('the pincode'),
    public_email: emailSchema,
    public_phone_no: requiredTrimmed('the public phone number'),
    public_fax: yup.string().trim(),
    support_email: optionalEmailSchema,
    support_mobile: optionalMobileSchema,
    support_person_name: yup.string().trim(),
    website: yup.string().trim(),
    tagline: yup.string().trim(),
    primary_color_code: yup.string().trim(),
    medical_officer_name: requiredTrimmed('the medical officer name'),
    medical_officer_position: yup.string().trim(),
    mrocc: requiredTrimmed('MROCC'),
    clia_number: requiredTrimmed('CLIA number'),
    smtp_server: requiredTrimmed('SMTP server'),
    smtp_port: requiredTrimmed('SMTP port'),
    smtp_email: emailSchema,
    smtp_password: yup.string().trim().required('SMTP password is required.'),
    approval_note: yup.string().trim(),
    fixed_price_amount: yup.string().trim(),
  });
}

export type B2bClientFormValues = yup.InferType<ReturnType<typeof b2bClientFormSchema>>;

export const b2bSubscriptionSchema = yup.object({
  start_date: yup.string().required('Start date is required.'),
  end_date: yup
    .string()
    .required('End date is required.')
    .test('after-start', 'End date must be after start date.', function (value) {
      if (!value || !this.parent.start_date) return true;
      return new Date(value) > new Date(this.parent.start_date);
    }),
  amount: yup
    .string()
    .required('Amount is required.')
    .test('positive-amount', 'Amount must be a positive number.', value => {
      if (!value) return false;
      const n = Number(value);
      return !Number.isNaN(n) && n > 0;
    }),
});

export type B2bSubscriptionFormValues = yup.InferType<typeof b2bSubscriptionSchema>;

export const b2bDocumentSchema = yup.object({
  typeDataId: yup.string().required('Document type is required.'),
});

export type B2bDocumentFormValues = yup.InferType<typeof b2bDocumentSchema>;

export const walletRechargeSchema = yup.object({
  amount: yup
    .string()
    .required('Amount is required.')
    .test('positive-amount', 'Please enter a valid positive amount.', value => {
      if (!value) return false;
      const n = Number(value);
      return !Number.isNaN(n) && n > 0;
    }),
  description: yup.string().trim(),
});

export type WalletRechargeFormValues = yup.InferType<typeof walletRechargeSchema>;

export const b2bManageParameterSchema = yup.object({
  name: yup.string().trim().required('Please enter the parameter name.'),
  placeholder: yup.string().trim().required('Please enter placeholder text.'),
  label: yup.string().trim().required('Please enter the field label.'),
  input_type: yup
    .string()
    .required('Please select a valid input type.')
    .oneOf(['1', '2'], 'Please select a valid input type.'),
  input_option: yup.string().when('input_type', {
    is: '2',
    then: schema =>
      schema
        .trim()
        .required('Please enter at least one dropdown value.')
        .test('comma-separated', 'Dropdown values must be comma separated without empty values.', value => {
          if (!value) return false;
          return !value.split(',').some(part => !part.trim());
        }),
    otherwise: schema => schema.trim(),
  }),
  unit_text: yup.string().trim().required('Please select or enter a unit.'),
  screening_cutoff: yup.string().trim().required('Please enter the screening cutoff.'),
  confirmation_cutoff: yup.string().trim().required('Please enter the confirmation cutoff.'),
  description: yup.string().trim(),
  is_mandatory: yup.boolean().oneOf([true], 'Please check Is Mandatory. This field is required.'),
  lab_test_id: yup.string().required('Please select a lab test.'),
});

export type B2bManageParameterFormValues = yup.InferType<typeof b2bManageParameterSchema>;

export const b2bProfileSettingsSchema = yup.object({
  id: yup.number().required(),
  support_person_name: yup.string().trim(),
  support_mobile: optionalMobileSchema,
  support_email: optionalEmailSchema,
  primary_color_code: yup.string().trim(),
  public_phone_no: yup.string().trim(),
  public_email: optionalEmailSchema,
  public_fax: yup.string().trim(),
  tagline: yup.string().trim(),
  smtp_server: yup.string().trim(),
  smtp_port: yup.string().trim(),
  smtp_email: optionalEmailSchema,
  smtp_password: yup.string(),
  company_name: yup.string().trim(),
  contact_person_name: yup.string().trim(),
});

export type B2bProfileSettingsFormValues = yup.InferType<typeof b2bProfileSettingsSchema>;

export const corporateProfileUpdateSchema = yup.object({
  contact_person_name: yup.string().trim(),
  address: yup.string().trim(),
  pincode: yup.string().trim(),
});

export type CorporateProfileUpdateFormValues = yup.InferType<typeof corporateProfileUpdateSchema>;

export const corporatePasswordChangeSchema = yup.object({
  oldPassword: yup.string(),
  newPassword: appPasswordSchema,
  confirmPassword: yup
    .string()
    .required('Please confirm your new password.')
    .oneOf([yup.ref('newPassword')], 'New Password and Confirm Password do not match.'),
});

export type CorporatePasswordChangeFormValues = yup.InferType<typeof corporatePasswordChangeSchema>;

export const superAdminProfileSchema = yup.object({
  name: requiredTrimmed('your name'),
  email: emailSchema,
  mobile: optionalMobileSchema,
});

export type SuperAdminProfileFormValues = yup.InferType<typeof superAdminProfileSchema>;

export const superAdminChangePasswordSchema = yup.object({
  currentPassword: yup.string().required('Old password is required.'),
  newPassword: appPasswordSchema,
  confirmPassword: yup
    .string()
    .required('Please confirm your password.')
    .oneOf([yup.ref('newPassword')], 'New passwords do not match.'),
});

export type SuperAdminChangePasswordFormValues = yup.InferType<typeof superAdminChangePasswordSchema>;

export function testRequestFormSchema(totalEmployees: number) {
  return yup.object({
    title: yup.string().trim().required('Request Title is mandatory'),
    year: yup.string().trim(),
    frequency: yup.string().trim(),
    quarter: yup.string().trim(),
    testType: yup.string().trim(),
    reasonForTest: yup.string().trim().required('Reason for test is mandatory'),
    selectionType: yup.string().trim(),
    isDrugSelected: yup.boolean(),
    drugCount: yup.number(),
    isAlcoholSelected: yup.boolean(),
    alcoholCount: yup.number(),
    isAlternateSelected: yup.boolean(),
    alternateCount: yup.number(),
  }).test('employee-counts', '', function (values) {
    if (!values) return true;
    const total = totalEmployees;
    const altC = values.alternateCount || 0;
    let alcC = values.alcoholCount || 0;
    if (values.selectionType === '2') alcC = Math.ceil((alcC / 100) * total);
    let drugC = values.drugCount || 0;
    if (values.selectionType === '2') drugC = Math.ceil((drugC / 100) * total);
    if (altC + drugC > total) {
      return this.createError({ path: 'drugCount', message: 'Count in Drug + Alternate exceeds total employees' });
    }
    if (altC + alcC > total) {
      return this.createError({ path: 'alcoholCount', message: 'Count in Alcohol + Alternate exceeds total employees' });
    }
    return true;
  });
}

export type TestRequestFormValues = yup.InferType<ReturnType<typeof testRequestFormSchema>>;

export function globalPricingSchema(priceKeys: string[]) {
  const shape: Record<string, yup.StringSchema> = {};
  priceKeys.forEach(key => {
    shape[key] = yup
      .string()
      .test('valid-price', 'Invalid value for one of the test prices', value => {
        if (value === '' || value == null) return true;
        const p = parseFloat(value);
        return !Number.isNaN(p) && p >= 0;
      });
  });
  return yup.object(shape);
}

const clinicianSpecialtySchema = yup
  .string()
  .oneOf(['MD', 'PA', 'NP'], 'Select MD, PA, or NP')
  .required('Specialty is required');

const patientIdRequiredSchema = yup
  .mixed()
  .test('patient-required', 'Please search and select a patient', value => value !== '' && value != null);

export const adultHealthCertificateSchema = yup.object({
  patient_id: patientIdRequiredSchema,
  free_from_disease: yup.boolean().default(false),
  satisfactory_physical: yup.boolean().default(false),
  tuberculin_test_type: yup.string().default(''),
  tuberculin_date_planted: yup.string().default(''),
  tuberculin_date_read: yup.string().default(''),
  tuberculin_result: yup.string().default(''),
  chest_xray_date: yup.string().default(''),
  chest_xray_result: yup.string().default(''),
  additional_info: yup.string().default(''),
  clinician_name: yup.string().trim().required('Clinician name is required'),
  clinician_specialty: clinicianSpecialtySchema,
  clinician_address: yup.string().default(''),
  date_of_examination: yup.string().required('Date of examination is required'),
});

export type AdultHealthCertificateFormValues = yup.InferType<typeof adultHealthCertificateSchema>;

// Optional clinical fields — unrestricted strings to match prior form behavior
const optionalString = yup.string().default('');

export const physicalExaminationCertificateSchema = yup.object({
  patient_id: patientIdRequiredSchema,
  age: optionalString,
  height: optionalString,
  weight: optionalString,
  bp: optionalString,
  pulse: optionalString,
  hearing_right: optionalString,
  hearing_left: optionalString,
  vision_right: optionalString,
  vision_left: optionalString,
  wear_glasses: yup.boolean().default(false),
  eval_head: optionalString,
  eval_nose: optionalString,
  eval_mouth: optionalString,
  eval_ears: optionalString,
  eval_eyes: optionalString,
  eval_lungs: optionalString,
  eval_heart: optionalString,
  eval_vascular: optionalString,
  eval_abdomen: optionalString,
  eval_spine: optionalString,
  eval_skin: optionalString,
  eval_neurologic: optionalString,
  additional_comments: optionalString,
  overall_condition: yup.string().default('Fit'),
  clinician_name: yup.string().trim().required('Clinician name is required'),
  clinician_specialty: clinicianSpecialtySchema,
  date_of_examination: yup.string().required('Date of examination is required'),
  clinician_address: optionalString,
});

export type PhysicalExaminationCertificateFormValues = yup.InferType<
  typeof physicalExaminationCertificateSchema
>;
