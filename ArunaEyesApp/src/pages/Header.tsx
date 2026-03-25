import { useNavigate } from "react-router-dom";

export default function Header(){
    const navigate = useNavigate();
    return(
        <header className="w-full h-20 flex items-center justify-center">
            <h1 onClick={() => navigate("/")} className="text-4xl bg-gradient-to-r from-slate-700 via-slate-300 to-slate-600 text-transparent bg-clip-text font-bold cursor-pointer">EYES</h1>
        </header>
    );
}