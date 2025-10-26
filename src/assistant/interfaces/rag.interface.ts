

export interface RagRequest {

    query: string;
    sources: string[];

}

export interface RagResponse {
    Codigo: number;
    Fragmentos: Fragmento[];
    Mensaje: string;
    Respuesta: boolean;
}

export interface Fragmento {
    documento: string;
    source: string;
}