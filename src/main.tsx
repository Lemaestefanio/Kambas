import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SiteContentProvider } from './cms/SiteContent';

createRoot(document.getElementById('root')!).render(<SiteContentProvider><App /></SiteContentProvider>);
