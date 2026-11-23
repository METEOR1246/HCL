import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from './ThemeContext'
import { LanguageProvider } from './i18n'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ThemeProvider><LanguageProvider><App /></LanguageProvider></ThemeProvider></React.StrictMode>)
