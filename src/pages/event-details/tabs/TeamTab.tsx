import React from 'react';
import { Briefcase, MapPin, Phone, Plus, Trash2, Users } from 'lucide-react';

type TeamMemberItem = {
  id: string;
  name: string;
  role?: string | null;
  phone?: string | null;
  address?: string | null;
};

type NewTeamMember = {
  name: string;
  role: string;
  phone: string;
  address: string;
};

type Props<TMember extends TeamMemberItem> = {
  newTeamMember: NewTeamMember;
  setNewTeamMember: (v: NewTeamMember) => void;
  onAdd: () => void | Promise<void>;

  team: TMember[];
  onDelete: (id: string) => void | Promise<void>;
};

export function TeamTab<TMember extends TeamMemberItem>({
  newTeamMember,
  setNewTeamMember,
  onAdd,
  team,
  onDelete,
}: Props<TMember>) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-purple-500" />
        Equipe de Cerimonial
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <input
          value={newTeamMember.name}
          onChange={(e) =>
            setNewTeamMember({ ...newTeamMember, name: e.target.value })
          }
          placeholder="Nome completo"
          className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <input
          value={newTeamMember.role}
          onChange={(e) =>
            setNewTeamMember({ ...newTeamMember, role: e.target.value })
          }
          placeholder="Função (ex: Recepcionista)"
          className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <input
          value={newTeamMember.phone}
          onChange={(e) =>
            setNewTeamMember({ ...newTeamMember, phone: e.target.value })
          }
          placeholder="Telefone / WhatsApp"
          className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <input
          value={newTeamMember.address}
          onChange={(e) =>
            setNewTeamMember({ ...newTeamMember, address: e.target.value })
          }
          placeholder="Endereço"
          className="md:col-span-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />

        <button
          onClick={onAdd}
          className="md:col-span-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors flex items-center justify-center"
          title="Adicionar membro"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map((member) => (
          <div
            key={member.id}
            className="group relative bg-white border border-gray-200 p-5 rounded-xl hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                  {member.name?.charAt(0)?.toUpperCase()}
                </div>

                <div>
                  <h4 className="font-bold text-gray-800">{member.name}</h4>
                  <span className="text-xs font-medium px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                    {member.role || 'Membro'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onDelete(member.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Remover membro"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              {member.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{member.phone}</span>
                </div>
              )}

              {member.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate" title={member.address}>
                    {member.address}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {team.length === 0 && (
          <div className="col-span-full py-10 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>Nenhum membro na equipe ainda.</p>
            <p className="text-sm">
              Adicione cerimonialistas, recepcionistas e seguranças aqui.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
