import Swal from 'sweetalert2';

// Configuración base para mantener consistencia
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

export const showAlert = (title, text, icon = 'info') => {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonColor: 'var(--primary-color, #D32F2F)',
    confirmButtonText: 'Aceptar'
  });
};

export const showSuccess = (title, text) => {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: 'var(--success-color, #388e3c)',
    confirmButtonText: 'Genial'
  });
};

export const showError = (title, text) => {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonColor: 'var(--error-color, #d32f2f)',
    confirmButtonText: 'Entendido'
  });
};

export const showConfirm = async (title, text, confirmText = 'Sí, continuar') => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: 'var(--primary-color, #D32F2F)',
    cancelButtonColor: '#9e9e9e',
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancelar'
  });
  return result.isConfirmed;
};

export const showToast = (title, icon = 'success') => {
  Toast.fire({
    icon,
    title
  });
};

export default {
  showAlert,
  showSuccess,
  showError,
  showConfirm,
  showToast
};
