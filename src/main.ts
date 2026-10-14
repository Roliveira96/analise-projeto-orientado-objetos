import './styles/base.css';
import './styles/menu.css';
import './styles/screens.css';
import './styles/diagrams.css';
import { Application } from './app/Application';

const root: HTMLElement = document.getElementById('app') as HTMLElement;
new Application(root).start();
