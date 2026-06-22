<?php

namespace App\Http\Controllers;

use App\Models\Template;
use App\Services\PlanLimits;
use Illuminate\Http\Request;

class TemplateController extends Controller
{
    public function index(Request $request)
    {
        $templates = $request->user()->templates()->latest()->get();
        return response()->json($templates);
    }

    public function store(Request $request)
    {
        $user  = $request->user();
        $count = $user->templates()->count();

        if (!PlanLimits::can($user, 'templates', $count)) {
            return PlanLimits::denyResponse('templates');
        }

        $data = $request->validate([
            'title'    => 'required|string|max:255',
            'content'  => 'required|string',
            'platform' => 'required|in:all,whatsapp',
        ]);

        $template = $user->templates()->create($data);

        return response()->json($template, 201);
    }

    public function update(Request $request, Template $template)
    {
        abort_if($template->user_id !== $request->user()->id, 403);

        $data = $request->validate([
            'title'    => 'sometimes|string|max:255',
            'content'  => 'sometimes|string',
            'platform' => 'sometimes|in:all,whatsapp',
        ]);

        $template->update($data);

        return response()->json($template);
    }

    public function destroy(Request $request, Template $template)
    {
        abort_if($template->user_id !== $request->user()->id, 403);
        $template->delete();
        return response()->json(null, 204);
    }
}
