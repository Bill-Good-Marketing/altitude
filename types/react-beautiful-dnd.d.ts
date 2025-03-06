declare module 'react-beautiful-dnd' {
    // Declare the components you use as 'any' or add more detailed types if desired.
    export const DragDropContext: any;
    export const Droppable: any;
    export const Draggable: any;
    export const resetServerContext: () => void;
  
    // Provide a custom interface for DropResult
    export interface DropResult {
      draggableId: string;
      type: string;
      source: {
        droppableId: string;
        index: number;
      };
      destination: {
        droppableId: string;
        index: number;
      } | null;
      reason?: string;
    }
  }
  