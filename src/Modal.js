import { useState } from 'react';
import RModal from 'react-modal';
import SolIcon from './assets/SolIcon';
import Ellipsis from './Ellipsis';

RModal.setAppElement('#root');

const customStyles = {
  overlay: {
    background: 'rgba(0,0,0,0.5)'
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(5, 4, 20, 0.95)',
    position: 'relative',
    maxWidth: '320px'
  },
};

const Modal = ({ isOpen, setIsOpen, tipSol, userAddress, tipping }) => {
  const [tipVal, setTipVal] = useState(0.01);

  const tipValChange = (e) => setTipVal(e.target.value);
  const close = () => setIsOpen(false);

  return (
    <RModal
      isOpen={isOpen}
      onDismiss={close}
      style={customStyles}
    >
      <button className="modal-close-button" onClick={close}>
        <span aria-hidden>×</span>
      </button>

      <div className="tip-container">
        <input className="tip-input" type="number" placeholder="Amount in Sol" step={0.01} value={tipVal} onChange={tipValChange} />
        <button title='click to tip gif poster' onClick={() => tipSol(userAddress, tipVal)} className='cta-button submit-gif-button tip-btn'>
          {tipping ? <Ellipsis /> : <><SolIcon /> Tip</>}
        </button>
      </div>
    </RModal>
  )
}

export default Modal