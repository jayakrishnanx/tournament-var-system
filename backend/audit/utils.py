from .models import AuditLog

def log_action(actor, action, target_type, target_id, before_state=None, after_state=None, ip_address=None):
    """
    Helper utility to record auditable events across the system.
    """
    return AuditLog.objects.create(
        actor=actor if (actor and actor.is_authenticated) else None,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        before_state=before_state or {},
        after_state=after_state or {},
        ip_address=ip_address
    )
