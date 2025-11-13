import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export default function Toast({ message, type, onClose }:{
  message:string; type:"success"|"error"|"info"; onClose:()=>void;
}) {
  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 max-w-md ${
      type==="success" ? "bg-[#94C751]/90 text-[#101707]"
      : type==="error" ? "bg-[#E85C5C]/90 text-white"
      : "bg-[#2D4014]/90 text-[#C9E3A8]"
    }`}>
      {type==="success" && <CheckCircle2 className="w-5 h-5"/>}
      {type==="error" && <AlertCircle className="w-5 h-5"/>}
      {type==="info" && <Info className="w-5 h-5"/>}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-opacity-70 hover:text-opacity-100">
        <X className="w-4 h-4"/>
      </button>
    </div>
  );
}
