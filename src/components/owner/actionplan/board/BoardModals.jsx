// Container de todos os modais de transição do Quadro de Ações.
import BlockModal from "./BlockModal";
import UnblockModal from "./UnblockModal";
import ProgressModal from "./ProgressModal";
import SubmitValidationModal from "./SubmitValidationModal";
import ValidateModal from "./ValidateModal";
import ReturnModal from "./ReturnModal";
import ReopenModal from "./ReopenModal";
import CancelModal from "./CancelModal";
import DuplicateModal from "./DuplicateModal";
import TransitionGuideModal from "./TransitionGuideModal";

export default function BoardModals({ activeModal, onClose, onConfirm, responsiblePeople = [] }) {
  const { type, action } = activeModal || {};
  const open = !!type;
  const close = () => onClose();
  const confirm = (modalType) => (id, payload) => onConfirm(modalType, id, payload);

  return (
    <>
      {type === "block" && <BlockModal action={action} open={open} onOpenChange={close} onConfirm={confirm("block")} responsiblePeople={responsiblePeople} />}
      {type === "unblock" && <UnblockModal action={action} open={open} onOpenChange={close} onConfirm={confirm("unblock")} responsiblePeople={responsiblePeople} />}
      {type === "progress" && <ProgressModal action={action} open={open} onOpenChange={close} onConfirm={confirm("progress")} />}
      {type === "submitValidation" && <SubmitValidationModal action={action} open={open} onOpenChange={close} onConfirm={confirm("submitValidation")} />}
      {type === "validate" && <ValidateModal action={action} open={open} onOpenChange={close} onConfirm={confirm("validate")} />}
      {type === "return" && <ReturnModal action={action} open={open} onOpenChange={close} onConfirm={confirm("return")} responsiblePeople={responsiblePeople} />}
      {type === "reopen" && <ReopenModal action={action} open={open} onOpenChange={close} onConfirm={confirm("reopen")} responsiblePeople={responsiblePeople} />}
      {type === "cancel" && <CancelModal action={action} open={open} onOpenChange={close} onConfirm={confirm("cancel")} />}
      {type === "duplicate" && <DuplicateModal action={action} open={open} onOpenChange={close} onConfirm={confirm("duplicate")} responsiblePeople={responsiblePeople} />}
      {type === "transitionGuide" && <TransitionGuideModal open={open} onOpenChange={close} />}
    </>
  );
}
