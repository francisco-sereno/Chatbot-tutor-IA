/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// --- CONSTANTS ---
const MODEL_NAME = "gemini-2.5-flash";

const textoPDFDocente = `Módulo "fundamentos de la IA": Fundamentos de la Inteligencia Artificial Generativa. Objetivo: Comprender los fundamentos, funcionamiento, impacto y aplicaciones. Caso de Estudio: Isabella Andrea, coordinadora de comunicaciones, usa IA para optimizar su trabajo. 1. Fundamentos: IA es tecnología para tareas humanas. Generatividad es la capacidad de crear contenido nuevo. 2. Diferencias: IA Tradicional clasifica; IA Generativa crea. 3. Funcionamiento: Funciona por predicción estadística. Limitaciones: Alucinaciones, sesgos, conocimiento no actualizado. 4. Herramientas: ChatGPT, Claude, Gemini. 5. Ética: Principios de Transparencia, Verificación, Responsabilidad, Privacidad. 6. Adopción: Requiere diagnóstico, pilotaje, optimización.`;

const systemInstruction = `**Rol y Personalidad:**
Actúe como un tutor académico experto, preciso y servicial. Su especialidad es el contenido del módulo "fundamentos de la IA". Su tono debe ser formal, utilizando el español de Chile. Su objetivo principal es facilitar el aprendizaje y sus respuestas deben ser breves y concisas. Su conocimiento se limita estrictamente al siguiente texto: """${textoPDFDocente}""".

**Lógica de Conversación y Reglas de Comportamiento:**
Analice la consulta del usuario y el historial de conversación para determinar la intención y siga estas reglas en orden de prioridad:

1.  **Regla de Ética:** Si la consulta es inapropiada o busca obtener respuestas de una evaluación (ej: "dame las respuestas de la prueba"), debe rehusar de manera firme y educativa: "Mi propósito es apoyar su proceso de aprendizaje y comprensión del módulo, no proporcionar las respuestas de evaluaciones. Le invito a que me consulte sobre los contenidos para prepararse adecuadamente."
2.  **Regla de Identidad:** Si la consulta es sobre su identidad ("quién eres", "qué haces"), responda con su función: "Soy un tutor de inteligencia artificial diseñado para responder consultas sobre los contenidos del módulo 'fundamentos de la IA'. Mi objetivo es facilitar su aprendizaje sobre este tema."
3.  **Regla de Refinamiento (Follow-up):** Si la consulta es una modificación de su respuesta anterior (ej: "hazlo más amable", "explícalo más simple", "dame más detalles"), **no** diga que se limita al módulo. En su lugar, tome su respuesta anterior del historial y reescríbala aplicando la modificación solicitada.
4.  **Regla de Comparación:** Si se le pide comparar dos o más conceptos del módulo, genere una comparación estructurada (ej: usando puntos o una tabla simple) que destaque las diferencias y similitudes clave.
5.  **Regla de Aplicación Práctica:** Si se le pregunta cómo un concepto se aplica al caso de "Isabella Andrea", conecte la teoría con el ejemplo práctico descrito en el texto.
6.  **Regla de Saludo:** Si la consulta es un saludo (como "hola", "buenos días") y es el primer o segundo mensaje de la conversación, responda amablemente: "Saludos. Soy su tutor de IA para el módulo 'fundamentos de la IA'. Puede realizar consultas sobre sus contenidos." Si ya se ha saludado, recuerde su propósito: "Mi conocimiento se limita a los contenidos del módulo 'fundamentos de la IA'. ¿En qué puedo ayudarle respecto al material de estudio?"
7.  **Regla de Consulta Específica:** Si la consulta es una pregunta específica sobre el contenido del módulo y no calza en las reglas anteriores, sintetice la información relevante del texto de referencia para dar una respuesta completa, directa, bien estructurada y concisa. Utilice negritas (**texto en negrita**) para destacar conceptos clave.
8.  **Regla de Sugerencia Proactiva:** Al final de una respuesta a una consulta sobre el contenido (especialmente tras aplicar las reglas 4, 5 o 7), sugiera proactivamente un tema relacionado del módulo para fomentar la exploración. La sugerencia debe ser variada, contextual y evitar repetir la pregunta anterior del usuario o la última sugerencia ofrecida. Formule la sugerencia como una pregunta atractiva. Puede basarse en los siguientes temas clave del módulo:
    *   Diferencias entre IA Tradicional y Generativa.
    *   Limitaciones (alucinaciones, sesgos).
    *   Principios éticos (Transparencia, Verificación, etc.).
    *   Proceso de adopción organizacional (diagnóstico, pilotaje).
    *   Aplicación práctica de un concepto al caso de Isabella Andrea.
    Por ejemplo: "¿Le interesaría ahora analizar las limitaciones más comunes de la IA Generativa, como las alucinaciones?" o "¿Quizás podríamos revisar los principios éticos que son fundamentales para un uso responsable de la IA?".
9.  **Regla Fuera de Contexto:** Si la consulta no puede ser respondida con el texto de referencia y no calza en ninguna otra regla, indíquelo claramente: "Mi conocimiento se limita a los contenidos del módulo 'fundamentos de la IA' y no puedo responder a esa consulta."`;

type MessageSender = 'user' | 'bot';

class Chatbot {
    // --- DOM ELEMENTS ---
    private readonly wrapper: HTMLElement;
    private readonly chatWindow: HTMLElement;
    private readonly form: HTMLFormElement;
    private readonly userInput: HTMLInputElement;
    private readonly sendBtn: HTMLButtonElement;
    private readonly creditsBtn: HTMLButtonElement;
    private readonly modalOverlay: HTMLElement;
    private readonly closeModalBtn: HTMLButtonElement;


    // --- STATE ---
    private chat: Chat | null = null;

    // --- CONSTANTS ---
    private readonly botIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`;
    private readonly thinkingHTML = `<div id="thinking" class="message-wrapper bot"><div class="bot-avatar">${this.botIconSVG}</div><div class="msg-bubble bot thinking-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
    private readonly initialBotMessage = "Saludos. Soy su tutor de IA para el módulo 'fundamentos de la IA'. Puede realizar consultas sobre sus contenidos.";
    
    constructor(selector: string) {
        this.wrapper = this.getElement<HTMLElement>(selector);
        this.chatWindow = this.getElement<HTMLElement>(".chat-window", this.wrapper);
        this.form = this.getElement<HTMLFormElement>("#chat-form", this.wrapper);
        this.userInput = this.getElement<HTMLInputElement>("#user-input", this.form);
        this.sendBtn = this.getElement<HTMLButtonElement>(".send-btn", this.form);
        
        this.creditsBtn = this.getElement<HTMLButtonElement>('#credits-btn', this.wrapper);
        this.modalOverlay = this.getElement<HTMLElement>('#credits-modal-overlay');
        this.closeModalBtn = this.getElement<HTMLButtonElement>('#close-modal-btn', this.modalOverlay);

    }
    
    public initialize(): void {
        try {
            this.initializeGemini();
            this.initializeModalListeners();
            this.form.addEventListener("submit", (event) => this.handleFormSubmit(event));
            this.appendMessage({ text: this.initialBotMessage, sender: "bot" });
        } catch (error) {
            const errorMessage = (error as Error).message;
            console.error("Chat Initialization Error:", errorMessage);
            this.appendMessage({ text: `**Error de Configuración:** ${errorMessage}`, sender: "bot" });
            this.setFormState(true);
        }
    }

    private getElement<T extends HTMLElement>(selector: string, parent: HTMLElement | Document = document): T {
        const element = parent.querySelector(selector) as T | null;
        if (!element) {
            throw new Error(`Critical error: Element with selector "${selector}" not found.`);
        }
        return element;
    }

    private initializeGemini(): void {
        if (!process.env.API_KEY) {
            throw new Error("No se ha configurado la API Key de Google. Por favor, asegúrese de que la variable de entorno API_KEY esté disponible.");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        this.chat = ai.chats.create({
            model: MODEL_NAME,
            config: {
                systemInstruction: systemInstruction,
            }
        });
    }
    
    private initializeModalListeners(): void {
        this.creditsBtn.addEventListener('click', () => this.openModal());
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.modalOverlay.addEventListener('click', (event) => {
            if (event.target === this.modalOverlay) {
                this.closeModal();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.modalOverlay.classList.contains('visible')) {
                this.closeModal();
            }
        });
    }

    private openModal(): void {
        this.modalOverlay.classList.add('visible');
        this.modalOverlay.setAttribute('aria-hidden', 'false');
    }

    private closeModal(): void {
        this.modalOverlay.classList.remove('visible');
        this.modalOverlay.setAttribute('aria-hidden', 'true');
    }

    private async getAssistantResponse(promptText: string): Promise<string> {
        if (!this.chat) {
            return `**Error de Inicialización:** El chat no se ha inicializado correctamente.`;
        }
        try {
            const response: GenerateContentResponse = await this.chat.sendMessage({ message: promptText });
            return response.text;
        } catch (error) {
            console.error("Error calling Google GenAI API:", error);
            return `**Error de Conexión:** Ha ocurrido un problema al contactar al asistente. Por favor, verifique su conexión a internet e inténtelo de nuevo más tarde.`;
        }
    }

    private sanitize = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    private formatResponse(text: string): string {
        const sanitizedText = this.sanitize(text);
        return sanitizedText
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/'(.*?)'/g, '<b>$1</b>');
    }

    private appendMessage({ text, sender }: { text: string; sender: MessageSender }): void {
        const wrapperDiv = document.createElement("div");
        wrapperDiv.className = `message-wrapper ${sender}`;
        
        const bubble = document.createElement("div");
        bubble.className = `msg-bubble ${sender}`;
        bubble.innerHTML = sender === "bot" ? this.formatResponse(text) : this.sanitize(text);

        if (sender === 'bot') {
            const iconDiv = document.createElement('div');
            iconDiv.className = 'bot-avatar';
            iconDiv.innerHTML = this.botIconSVG;
            wrapperDiv.appendChild(iconDiv);
        }

        wrapperDiv.appendChild(bubble);
        this.chatWindow.appendChild(wrapperDiv);
        this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
    }

    private showThinking = (): void => {
        if (!this.chatWindow.querySelector('#thinking')) {
            this.chatWindow.insertAdjacentHTML("beforeend", this.thinkingHTML);
            this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
        }
    };

    private removeThinking = (): void => {
        this.chatWindow.querySelector("#thinking")?.remove();
    };

    private setFormState(disabled: boolean): void {
        this.userInput.disabled = disabled;
        this.sendBtn.disabled = disabled;
        if (!disabled) {
            this.userInput.focus();
        }
    }

    private async handleFormSubmit(event: SubmitEvent): Promise<void> {
        event.preventDefault();
        const query = this.userInput.value.trim();
        if (!query) return;

        this.appendMessage({ text: query, sender: 'user' });
        this.userInput.value = "";
        this.showThinking();
        this.setFormState(true);

        const responseText = await this.getAssistantResponse(query);

        this.removeThinking();
        this.appendMessage({ text: responseText, sender: "bot" });
        this.setFormState(false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const chatbot = new Chatbot('#chatbot-wrapper');
        chatbot.initialize();
    } catch (error) {
        console.error("Failed to initialize chatbot:", error);
        document.body.innerHTML = `<div style="color: red; padding: 20px; text-align: center; font-family: sans-serif;">Error Crítico: No se pudo iniciar el chatbot. ${(error as Error).message}</div>`;
    }
});