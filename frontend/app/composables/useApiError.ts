export function useApiError() {
  function message(error: any, fallback = 'Something went wrong. Please try again.') {
    const data = error?.data ?? error?.response?._data;
    const errors = data?.errors;
    if (errors && typeof errors === 'object') return Object.values(errors).join(' ');
    return data?.message ?? error?.message ?? fallback;
  }

  return { message };
}
