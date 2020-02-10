function openModal(modalId) {
    $(`#${modalId}`).modal({backdrop: "static", keyboard: false})
}

function closeModal(modalId) {
    const modal = $(`#${modalId}`);
    if ((modal.data("bs.modal") || {})._isShown) {
        modal.modal("toggle");
    }
}