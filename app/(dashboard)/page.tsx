import Agenda from '@/components/Agenda';
import { verifySession } from '@/lib/sessions';

export default async function AgendaPage() {
  return (
      /* Agenda handles its own "No user" state by showing an empty calendar 
         or checking local storage. 
         We pass a dummy function for onSettingsClick or refactor Agenda to not require it prop-drilled 
         if the Settings button is now in the Sidebar.
         For now, we pass an empty function or handle it inside Agenda.
      */
      <AgendaWrapper />
  );
}


import AgendaWrapper from '@/components/AgendaWrapper';